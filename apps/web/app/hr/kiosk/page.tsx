'use client'

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, LogIn, LogOut, Clock, ScanFace, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MAX_ATTEMPTS = 5;
const ATTEMPT_DELAY = 800;
// Average multiple frames per attempt so one blurry/oblique frame doesn't
// swing the embedding into a lookalike's match zone.
const FRAMES_PER_ATTEMPT = 3;
const FRAME_INTERVAL_MS = 180;
// Minimum minutes between marking an entrada and the following salida,
// so employees can't accidentally mark both back-to-back.
const EXIT_COOLDOWN_MINUTES = 30;
// If an entrada has no salida after this many hours, the shift is treated
// as abandoned: HR fixes it manually later, and the next mark is a new entrada.
const MAX_OPEN_SHIFT_HOURS = 13;

interface Candidate {
    id: number;
    name: string;
    sim: number;
}

interface IdentifyResult {
    employee_id: number;
    first_name: string;
    last_name: string;
    photo_url: string;
    similarity: number;
    margin: number | null;
    top_candidates: Candidate[];
    embedding: number[] | null;
}

interface FailureRecord {
    reason: string;
    best_similarity: number | null;
    margin: number | null;
    top_candidates: Candidate[];
    embedding: number[] | null;
}

// Upload a captured frame to the `hr` bucket. Returns the public URL or null
// on failure — we never want storage errors to block a successful marking.
async function uploadCapture(blob: Blob): Promise<string | null> {
    try {
        const filename = `captures/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
        const { error } = await supabase.storage
            .from('hr')
            .upload(filename, blob, { contentType: 'image/jpeg', upsert: false });
        if (error) {
            console.error('Kiosk upload error', error);
            return null;
        }
        const { data } = supabase.storage.from('hr').getPublicUrl(filename);
        return data?.publicUrl ?? null;
    } catch (e) {
        console.error('Kiosk upload exception', e);
        return null;
    }
}

export default function HRKioskPage() {
    const [open, setOpen] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [status, setStatus] = useState<'detecting' | 'success' | 'failed' | 'blocked'>('detecting');
    const [message, setMessage] = useState('');
    const [matchedEmployee, setMatchedEmployee] = useState<IdentifyResult | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const detectingRef = useRef(false);
    const cancelledRef = useRef(false);
    const lastReasonRef = useRef<string | null>(null);
    // The most recent capture — kept in a ref so we can persist it whether the
    // scan ends in success (attendance_logs.photo_url) or failure
    // (attendance_recognition_failures.photo_url).
    const lastFrameRef = useRef<Blob | null>(null);
    const lastFailureRef = useRef<FailureRecord | null>(null);

    const handleClose = useCallback(() => {
        cancelledRef.current = true;
        detectingRef.current = false;
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setStream(null);
        setOpen(false);
        setStatus('detecting');
        setMessage('');
        setMatchedEmployee(null);
    }, []);

    // Attach stream to video
    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.error("Kiosk play error:", e));
        }
    }, [stream]);

    const startSession = async () => {
        cancelledRef.current = false;
        detectingRef.current = false;
        setStatus('detecting');
        setMessage('');
        setMatchedEmployee(null);
        setOpen(true);

        try {
            const s = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
            });
            streamRef.current = s;
            setStream(s);
        } catch (e) {
            console.error(e);
            toast.error("No se pudo acceder a la cámara");
            handleClose();
        }
    };

    const captureFrame = (): Promise<Blob | null> => {
        return new Promise((resolve) => {
            if (!videoRef.current || videoRef.current.videoWidth === 0) {
                resolve(null);
                return;
            }
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
            canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
        });
    };

    const captureBurst = async (): Promise<Blob[]> => {
        const frames: Blob[] = [];
        for (let i = 0; i < FRAMES_PER_ATTEMPT; i++) {
            if (cancelledRef.current) break;
            if (i > 0) await new Promise(resolve => setTimeout(resolve, FRAME_INTERVAL_MS));
            const blob = await captureFrame();
            if (blob) frames.push(blob);
        }
        return frames;
    };

    const runIdentification = useCallback(async (attemptNum: number) => {
        if (detectingRef.current || cancelledRef.current) return;

        detectingRef.current = true;
        setStatus('detecting');

        try {
            const frames = await captureBurst();
            if (frames.length === 0 || cancelledRef.current) {
                detectingRef.current = false;
                if (!cancelledRef.current && attemptNum < MAX_ATTEMPTS) {
                    setTimeout(() => runIdentification(attemptNum + 1), ATTEMPT_DELAY);
                } else if (!cancelledRef.current) {
                    // Exhausted retries with no capturable frames — log as no_face_detected
                    // with no photo (we have nothing to upload).
                    lastFailureRef.current = {
                        reason: 'no_face_detected',
                        best_similarity: null, margin: null,
                        top_candidates: [], embedding: null,
                    };
                    handleFinalFailure();
                    setStatus('failed');
                    setMessage("No se detectó un rostro. Posiciónese frente a la cámara.");
                }
                return;
            }

            // Keep the first frame around so we can upload it whether this ends
            // in success or failure.
            lastFrameRef.current = frames[0];

            const formData = new FormData();
            frames.forEach((blob, i) => {
                formData.append('images', blob, `capture_${i}.jpg`);
            });

            const res = await fetch(`${API_URL}/api/hr/identify`, {
                method: 'POST',
                body: formData,
            });

            if (cancelledRef.current) { detectingRef.current = false; return; }

            const data = await res.json();

            if (!res.ok) {
                const reason = data?.detail?.error || 'no_face_detected';
                lastFailureRef.current = {
                    reason,
                    best_similarity: null, margin: null,
                    top_candidates: [], embedding: null,
                };
                detectingRef.current = false;
                if (attemptNum < MAX_ATTEMPTS) {
                    setTimeout(() => runIdentification(attemptNum + 1), ATTEMPT_DELAY);
                } else {
                    handleFinalFailure();
                    setStatus('failed');
                    setMessage("No se detectó un rostro. Posiciónese frente a la cámara.");
                }
                return;
            }

            if (data.match) {
                lastReasonRef.current = null;
                lastFailureRef.current = null;
                handleSuccess(
                    {
                        employee_id: data.employee_id,
                        first_name: data.first_name,
                        last_name: data.last_name || '',
                        photo_url: data.photo_url || '',
                        similarity: data.similarity,
                        margin: data.margin ?? null,
                        top_candidates: data.top_candidates ?? [],
                        embedding: data.embedding ?? null,
                    },
                    frames[0],
                );
            } else {
                lastReasonRef.current = data.reason || null;
                lastFailureRef.current = {
                    reason: data.reason || 'below_threshold',
                    best_similarity: data.similarity ?? null,
                    margin: data.margin ?? null,
                    top_candidates: data.top_candidates ?? [],
                    embedding: data.embedding ?? null,
                };
                detectingRef.current = false;
                if (attemptNum < MAX_ATTEMPTS) {
                    setTimeout(() => runIdentification(attemptNum + 1), ATTEMPT_DELAY);
                } else {
                    handleFinalFailure();
                    setStatus('failed');
                    setMessage(
                        lastReasonRef.current === 'ambiguous'
                            ? "Rostro no identificado con certeza. Acérquese más, retire lentes o tapabocas e intente de nuevo."
                            : "No se reconoce el rostro."
                    );
                }
            }
        } catch (e: any) {
            console.error("Identification error", e);
            detectingRef.current = false;
            if (attemptNum < MAX_ATTEMPTS && !cancelledRef.current) {
                setTimeout(() => runIdentification(attemptNum + 1), ATTEMPT_DELAY);
            } else if (!cancelledRef.current) {
                setStatus('failed');
                setMessage("Error de conexión al servidor.");
            }
        }
    }, []);

    // Fire-and-forget persistence of a failed scan. We don't await the upload
    // because the kiosk should feel responsive even when the network is slow.
    const handleFinalFailure = useCallback(() => {
        const failure = lastFailureRef.current;
        const frame = lastFrameRef.current;
        if (!failure) return;
        (async () => {
            try {
                const photoUrl = frame ? await uploadCapture(frame) : null;
                await supabase.from('attendance_recognition_failures').insert({
                    reason: failure.reason,
                    photo_url: photoUrl,
                    top_candidates: failure.top_candidates as any,
                    best_similarity: failure.best_similarity,
                    margin: failure.margin,
                    extracted_embedding: failure.embedding as any,
                });
            } catch (e) {
                console.error('Failed to persist recognition failure', e);
            }
        })();
    }, []);

    const handleSuccess = async (employee: IdentifyResult, frame: Blob | null) => {
        setMatchedEmployee(employee);
        detectingRef.current = false;

        // Look back far enough to catch overnight or open shifts from prior days.
        const lookbackStart = new Date(Date.now() - 36 * 60 * 60 * 1000);

        const { data: logs } = await supabase.from('attendance_logs')
            .select('*')
            .eq('employee_id', employee.employee_id)
            .gte('timestamp', lookbackStart.toISOString())
            .order('timestamp', { ascending: false })
            .limit(1);

        let type = 'entrada';
        if (logs && logs.length > 0 && logs[0].type === 'entrada' && logs[0].timestamp) {
            const lastEntryTime = new Date(logs[0].timestamp);
            const minutesSinceEntry = (Date.now() - lastEntryTime.getTime()) / 60000;
            const hoursSinceEntry = minutesSinceEntry / 60;

            if (hoursSinceEntry >= MAX_OPEN_SHIFT_HOURS) {
                // Previous shift was abandoned without a salida — leave it open
                // for HR to close manually, and treat this mark as a new entrada.
                type = 'entrada';
            } else if (minutesSinceEntry < EXIT_COOLDOWN_MINUTES) {
                // If the last mark was an entrada less than EXIT_COOLDOWN_MINUTES
                // ago, refuse to register a salida to avoid accidental double-marks.
                const minutesWaited = Math.max(0, Math.floor(minutesSinceEntry));
                const minutesRemaining = Math.max(1, Math.ceil(EXIT_COOLDOWN_MINUTES - minutesSinceEntry));
                setStatus('blocked');
                setMessage(
                    `${employee.first_name}, acabas de marcar entrada hace ${minutesWaited} min. ` +
                    `Podrás registrar tu salida en ${minutesRemaining} min.`
                );
                setTimeout(() => {
                    handleClose();
                }, 4000);
                return;
            } else {
                type = 'salida';
            }
        }

        setStatus('success');
        setMessage(type === 'entrada'
            ? `¡Bienvenido, ${employee.first_name}!`
            : `¡Hasta luego, ${employee.first_name}!`
        );
        // Close the dialog on the same schedule as before; the upload + insert
        // below runs in parallel and does not block the UX.
        setTimeout(() => {
            handleClose();
        }, 2500);

        // Persist in the background so a slow upload doesn't delay the next user.
        (async () => {
            try {
                const photoUrl = frame ? await uploadCapture(frame) : null;
                await supabase.from('attendance_logs').insert({
                    employee_id: employee.employee_id,
                    type: type,
                    timestamp: new Date().toISOString(),
                    confidence_score: parseFloat(employee.similarity.toFixed(3)),
                    margin: employee.margin,
                    photo_url: photoUrl,
                    top_candidates: employee.top_candidates as any,
                    extracted_embedding: employee.embedding as any,
                });
            } catch (e) {
                console.error('Failed to persist attendance log', e);
            }
        })();
    };

    const handleHardReset = useCallback(async () => {
        try {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
            try { sessionStorage.clear(); } catch {}
            try { localStorage.clear(); } catch {}
            if (typeof caches !== 'undefined') {
                try {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(k => caches.delete(k)));
                } catch {}
            }
            if ('serviceWorker' in navigator) {
                try {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(regs.map(r => r.unregister()));
                } catch {}
            }
            try {
                document.cookie.split(';').forEach((c) => {
                    const name = c.split('=')[0].trim();
                    if (!name) return;
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
                });
            } catch {}
        } finally {
            window.location.reload();
        }
    }, []);

    // Remote-control channel: admin UI can broadcast a 'hard_reset' event to
    // force this kiosk to clear caches and reload — same as pressing the
    // Reiniciar button physically, but triggered from elsewhere.
    useEffect(() => {
        const channel = supabase.channel('kiosk:control')
            .on('broadcast', { event: 'hard_reset' }, () => {
                console.log('Kiosk received remote hard_reset');
                handleHardReset();
            })
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [handleHardReset]);

    // Auto-start identification when video is playing
    useEffect(() => {
        if (!stream || !open) return;

        const video = videoRef.current;
        if (!video) return;

        const onPlaying = () => {
            setTimeout(() => {
                if (!cancelledRef.current && !detectingRef.current) {
                    runIdentification(1);
                }
            }, 500);
        };

        video.addEventListener('playing', onPlaying);
        if (!video.paused && video.readyState >= 2) {
            onPlaying();
        }

        return () => video.removeEventListener('playing', onPlaying);
    }, [stream, open]);

    return (
        <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex flex-col items-center justify-center p-4 font-sans">
            {/* Header */}
            <header className="mb-8 flex flex-col items-center">
                <div className="flex items-center gap-2 opacity-60 mb-2">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium tracking-wide">Kiosco de Asistencia</span>
                </div>
            </header>

            {/* Big register button */}
            <button
                onClick={startSession}
                className="group relative flex flex-col items-center justify-center gap-6 w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 active:scale-95 transition-all duration-300"
            >
                <ScanFace className="h-24 w-24 sm:h-28 sm:w-28 opacity-90 group-hover:opacity-100 transition-opacity" />
                <span className="text-2xl sm:text-3xl font-bold tracking-tight">Registrar</span>
            </button>

            <p className="mt-6 text-muted-foreground text-sm">
                Toque para registrar entrada o salida
            </p>

            {/* Reset / refresh button — fixed bottom-right for kiosk recovery */}
            <button
                onClick={handleHardReset}
                aria-label="Reiniciar pantalla"
                title="Reiniciar pantalla"
                className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-neutral-800/80 hover:bg-neutral-900 text-white shadow-lg backdrop-blur transition-colors"
            >
                <RefreshCw className="h-5 w-5" />
                <span className="text-sm font-medium hidden sm:inline">Reiniciar</span>
            </button>

            {/* Identification dialog */}
            <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
                <DialogContent className="sm:max-w-md border-0 bg-transparent shadow-none">
                    <DialogTitle className="hidden">Identificación</DialogTitle>
                    <Card className="w-full border-0 shadow-2xl overflow-hidden backdrop-blur-3xl bg-white/90 dark:bg-zinc-900/90 ring-1 ring-black/5">
                        <div className="text-center pb-2 pt-6 px-6">
                            <div className="text-2xl font-bold flex flex-col items-center gap-2">
                                {status === 'success' && matchedEmployee ? (
                                    <>
                                        <Avatar className="h-16 w-16 ring-4 ring-green-500 shadow-lg">
                                            <AvatarImage src={matchedEmployee.photo_url} className="object-cover" />
                                            <AvatarFallback className="text-xl">{matchedEmployee.first_name[0]}</AvatarFallback>
                                        </Avatar>
                                        <CheckCircle2 className="h-8 w-8 text-green-500 animate-in zoom-in spin-in-50 duration-500" />
                                    </>
                                ) : status === 'blocked' && matchedEmployee ? (
                                    <>
                                        <Avatar className="h-16 w-16 ring-4 ring-amber-500 shadow-lg">
                                            <AvatarImage src={matchedEmployee.photo_url} className="object-cover" />
                                            <AvatarFallback className="text-xl">{matchedEmployee.first_name[0]}</AvatarFallback>
                                        </Avatar>
                                        <AlertTriangle className="h-8 w-8 text-amber-500 animate-in zoom-in duration-300" />
                                    </>
                                ) : status === 'failed' ? (
                                    <XCircle className="h-12 w-12 text-red-500 animate-in zoom-in duration-300" />
                                ) : (
                                    <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                                )}
                                <span className="text-lg">
                                    {status === 'success' ? 'Identidad Confirmada' :
                                        status === 'blocked' ? 'Espera un momento' :
                                            status === 'failed' ? 'No Identificado' :
                                                'Identificando...'}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col items-center p-6 pt-2">
                            <div className="relative rounded-2xl overflow-hidden shadow-2xl w-full aspect-[4/3] bg-black">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className={cn(
                                        "w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-500",
                                        (status === 'success' || status === 'blocked') ? "opacity-50 grayscale" : "opacity-100"
                                    )}
                                />
                                {status === 'detecting' && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-40 h-52 border-[3px] border-dashed border-white/50 rounded-[50%]" />
                                    </div>
                                )}
                                {status === 'success' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center animate-in fade-in duration-500">
                                        {message.includes('Bienvenido') ? (
                                            <LogIn className="h-20 w-20 text-green-400 mb-2 drop-shadow-lg" />
                                        ) : (
                                            <LogOut className="h-20 w-20 text-orange-400 mb-2 drop-shadow-lg" />
                                        )}
                                        <p className="text-white font-bold text-xl drop-shadow-md text-center px-4">{message}</p>
                                    </div>
                                )}
                                {status === 'blocked' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 animate-in fade-in duration-500 px-4">
                                        <AlertTriangle className="h-16 w-16 text-amber-400 mb-2 drop-shadow-lg" />
                                        <p className="text-white font-bold text-lg drop-shadow-md text-center">{message}</p>
                                    </div>
                                )}
                                {status === 'failed' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 animate-in fade-in">
                                        <p className="text-white font-bold text-center px-4">{message}</p>
                                        <Button onClick={() => {
                                            cancelledRef.current = false;
                                            runIdentification(1);
                                        }} variant="secondary" className="mt-4">
                                            Reintentar
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {status === 'detecting' && (
                                <p className="text-center text-sm text-muted-foreground mt-4">
                                    Mire a la cámara...
                                </p>
                            )}
                        </div>
                    </Card>
                </DialogContent>
            </Dialog>
        </div>
    )
}
