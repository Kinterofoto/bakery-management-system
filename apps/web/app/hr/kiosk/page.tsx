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
import { Loader2, CheckCircle2, XCircle, LogIn, LogOut, Clock, ScanFace } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MAX_ATTEMPTS = 5;
const ATTEMPT_DELAY = 800;

interface IdentifyResult {
    employee_id: number;
    first_name: string;
    last_name: string;
    photo_url: string;
    similarity: number;
}

export default function HRKioskPage() {
    const [open, setOpen] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [status, setStatus] = useState<'detecting' | 'success' | 'failed'>('detecting');
    const [message, setMessage] = useState('');
    const [matchedEmployee, setMatchedEmployee] = useState<IdentifyResult | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const detectingRef = useRef(false);
    const cancelledRef = useRef(false);

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
            canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8);
        });
    };

    const runIdentification = useCallback(async (attemptNum: number) => {
        if (detectingRef.current || cancelledRef.current) return;

        detectingRef.current = true;
        setStatus('detecting');

        try {
            const blob = await captureFrame();
            if (!blob || cancelledRef.current) {
                detectingRef.current = false;
                if (!cancelledRef.current && attemptNum < MAX_ATTEMPTS) {
                    setTimeout(() => runIdentification(attemptNum + 1), ATTEMPT_DELAY);
                }
                return;
            }

            const formData = new FormData();
            formData.append('image', blob, 'capture.jpg');

            const res = await fetch(`${API_URL}/api/hr/identify`, {
                method: 'POST',
                body: formData,
            });

            if (cancelledRef.current) { detectingRef.current = false; return; }

            const data = await res.json();

            if (!res.ok) {
                detectingRef.current = false;
                if (attemptNum < MAX_ATTEMPTS) {
                    setTimeout(() => runIdentification(attemptNum + 1), ATTEMPT_DELAY);
                } else {
                    setStatus('failed');
                    setMessage("No se detectó un rostro. Posiciónese frente a la cámara.");
                }
                return;
            }

            if (data.match) {
                handleSuccess({
                    employee_id: data.employee_id,
                    first_name: data.first_name,
                    last_name: data.last_name || '',
                    photo_url: data.photo_url || '',
                    similarity: data.similarity,
                });
            } else {
                detectingRef.current = false;
                if (attemptNum < MAX_ATTEMPTS) {
                    setTimeout(() => runIdentification(attemptNum + 1), ATTEMPT_DELAY);
                } else {
                    setStatus('failed');
                    setMessage("No se reconoce el rostro.");
                }
            }
        } catch (e: any) {
            console.error("Identification error", e);
            detectingRef.current = false;
            if (attemptNum < MAX_ATTEMPTS && !cancelledRef.current) {
                setTimeout(() => runIdentification(attemptNum + 1), ATTEMPT_DELAY);
            } else {
                setStatus('failed');
                setMessage("Error de conexión al servidor.");
            }
        }
    }, []);

    const handleSuccess = async (employee: IdentifyResult) => {
        setStatus('success');
        setMatchedEmployee(employee);
        detectingRef.current = false;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { data: logs } = await supabase.from('attendance_logs')
            .select('*')
            .eq('employee_id', employee.employee_id)
            .gte('timestamp', todayStart.toISOString())
            .order('timestamp', { ascending: false })
            .limit(1);

        let type = 'entrada';
        if (logs && logs.length > 0 && logs[0].type === 'entrada') {
            type = 'salida';
        }

        await supabase.from('attendance_logs').insert({
            employee_id: employee.employee_id,
            type: type,
            timestamp: new Date().toISOString(),
            confidence_score: parseFloat(employee.similarity.toFixed(3))
        });

        setMessage(type === 'entrada'
            ? `¡Bienvenido, ${employee.first_name}!`
            : `¡Hasta luego, ${employee.first_name}!`
        );

        setTimeout(() => {
            handleClose();
        }, 2500);
    };

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
                                ) : status === 'failed' ? (
                                    <XCircle className="h-12 w-12 text-red-500 animate-in zoom-in duration-300" />
                                ) : (
                                    <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                                )}
                                <span className="text-lg">
                                    {status === 'success' ? 'Identidad Confirmada' :
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
                                        status === 'success' ? "opacity-50 grayscale" : "opacity-100"
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
