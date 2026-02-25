'use client'

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, LogIn, LogOut, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MAX_ATTEMPTS = 5;
const ATTEMPT_DELAY = 800; // ms between auto-retries

export default function HRKioskPage() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
    const [verificationStatus, setVerificationStatus] = useState<'idle' | 'detecting' | 'success' | 'failed'>('idle');
    const [message, setMessage] = useState('');
    const [attempt, setAttempt] = useState(0);

    // Camera Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const detectingRef = useRef(false);
    const cancelledRef = useRef(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const [{ data: employeesData }, { data: logsData }] = await Promise.all([
            supabase.from('employees').select('*').eq('is_active', true).order('first_name'),
            supabase.from('attendance_logs')
                .select('employee_id, type, timestamp')
                .gte('timestamp', yesterday.toISOString())
                .order('timestamp', { ascending: false }),
        ]);

        if (employeesData) {
            const statusMap: Record<string, boolean> = {};
            logsData?.forEach(log => {
                if (statusMap[log.employee_id] === undefined) {
                    statusMap[log.employee_id] = (log.type === 'entrada');
                }
            });

            const parsed = employeesData.map(e => ({
                ...e,
                isInShift: statusMap[e.id] || false
            }));

            setEmployees(parsed);
        }
        setLoading(false);
    };

    const handleClose = () => {
        cancelledRef.current = true;
        stopCamera();
        setSelectedEmployee(null);
        setVerificationStatus('idle');
        setMessage('');
        setAttempt(0);
        detectingRef.current = false;
    };

    // Attach stream to video when ready
    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.error("Kiosk play error:", e));
        }
    }, [stream, selectedEmployee]);

    const startCamera = async () => {
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

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
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

    const runVerification = useCallback(async (employee: any, attemptNum: number) => {
        if (detectingRef.current || cancelledRef.current) return;

        detectingRef.current = true;
        setVerificationStatus('detecting');
        setAttempt(attemptNum);

        try {
            const blob = await captureFrame();
            if (!blob || cancelledRef.current) {
                detectingRef.current = false;
                if (!cancelledRef.current && attemptNum < MAX_ATTEMPTS) {
                    setTimeout(() => runVerification(employee, attemptNum + 1), ATTEMPT_DELAY);
                }
                return;
            }

            const formData = new FormData();
            formData.append('image', blob, 'capture.jpg');
            formData.append('employee_id', String(employee.id));

            const res = await fetch(`${API_URL}/api/hr/verify`, {
                method: 'POST',
                body: formData,
            });

            if (cancelledRef.current) { detectingRef.current = false; return; }

            const data = await res.json();

            if (!res.ok) {
                // No face detected - retry automatically
                detectingRef.current = false;
                if (attemptNum < MAX_ATTEMPTS) {
                    setTimeout(() => runVerification(employee, attemptNum + 1), ATTEMPT_DELAY);
                } else {
                    setVerificationStatus('failed');
                    setMessage("No se detectó un rostro. Posiciónese frente a la cámara.");
                }
                return;
            }

            if (data.match) {
                handleSuccess(employee, data.similarity);
            } else {
                detectingRef.current = false;
                if (attemptNum < MAX_ATTEMPTS) {
                    setTimeout(() => runVerification(employee, attemptNum + 1), ATTEMPT_DELAY);
                } else {
                    setVerificationStatus('failed');
                    setMessage("No se reconoce el rostro.");
                }
            }
        } catch (e: any) {
            console.error("Verification error", e);
            detectingRef.current = false;
            if (attemptNum < MAX_ATTEMPTS && !cancelledRef.current) {
                setTimeout(() => runVerification(employee, attemptNum + 1), ATTEMPT_DELAY);
            } else {
                setVerificationStatus('failed');
                setMessage("Error de conexión al servidor.");
            }
        }
    }, []);

    const handleSuccess = async (employee: any, similarity: number) => {
        setVerificationStatus('success');
        detectingRef.current = false;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { data: logs } = await supabase.from('attendance_logs')
            .select('*')
            .eq('employee_id', employee.id)
            .gte('timestamp', todayStart.toISOString())
            .order('timestamp', { ascending: false })
            .limit(1);

        let type = 'entrada';
        if (logs && logs.length > 0 && logs[0].type === 'entrada') {
            type = 'salida';
        }

        await supabase.from('attendance_logs').insert({
            employee_id: employee.id,
            type: type,
            timestamp: new Date().toISOString(),
            confidence_score: parseFloat(similarity.toFixed(3))
        });

        setMessage(type === 'entrada' ? `¡Bienvenido, ${employee.first_name}!` : `¡Hasta luego, ${employee.first_name}!`);

        setTimeout(() => {
            handleClose();
            loadData();
        }, 2500);
    };

    // Start camera when employee is selected, then auto-verify once video is playing
    useEffect(() => {
        if (selectedEmployee) {
            cancelledRef.current = false;
            detectingRef.current = false;
            setTimeout(startCamera, 100);
        }
        return () => stopCamera();
    }, [selectedEmployee]);

    // Auto-start verification when video stream is ready
    useEffect(() => {
        if (!stream || !selectedEmployee || verificationStatus === 'success') return;

        const video = videoRef.current;
        if (!video) return;

        const onPlaying = () => {
            // Small delay to let the camera stabilize
            setTimeout(() => {
                if (!cancelledRef.current && !detectingRef.current) {
                    runVerification(selectedEmployee, 1);
                }
            }, 500);
        };

        video.addEventListener('playing', onPlaying);
        // If already playing, trigger immediately
        if (!video.paused && video.readyState >= 2) {
            onPlaying();
        }

        return () => video.removeEventListener('playing', onPlaying);
    }, [stream, selectedEmployee]);

    return (
        <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 p-4 font-sans flex flex-col">
            {/* Minimal Header */}
            <header className="mb-6 flex flex-col items-center justify-center">
                <div className="flex items-center gap-2 opacity-60">
                    <Clock className="h-4 w-4" />
                    <h1 className="text-sm font-medium tracking-wide border-b border-transparent">
                        Kiosco de Asistencia
                    </h1>
                </div>
            </header>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-neutral-400" />
                </div>
            ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 max-w-[1600px] mx-auto w-full px-2">
                    {employees.map(emp => (
                        <Card
                            key={emp.id}
                            onClick={() => setSelectedEmployee(emp)}
                            className="group cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 border-0 shadow-sm hover:shadow-md bg-white dark:bg-zinc-900 overflow-hidden"
                        >
                            <CardContent className="flex flex-col items-center p-3 gap-2">
                                <div className="relative">
                                    <Avatar className="h-14 w-14 sm:h-16 sm:w-16 ring-2 ring-neutral-100 group-hover:ring-blue-100 transition-all">
                                        <AvatarImage src={emp.photo_url} className="object-cover" />
                                        <AvatarFallback className="text-lg bg-neutral-100 text-neutral-500">{emp.first_name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div
                                        className={cn(
                                            "absolute bottom-0 right-0 h-3 w-3 sm:h-4 sm:w-4 border-2 border-white dark:border-zinc-900 rounded-full",
                                            emp.isInShift ? "bg-green-500" : "bg-red-500"
                                        )}
                                    />
                                </div>
                                <div className="text-center w-full">
                                    <h3 className="font-semibold text-xs sm:text-sm text-neutral-700 dark:text-neutral-200 truncate w-full px-1">
                                        {emp.first_name}
                                    </h3>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}


            <Dialog open={!!selectedEmployee} onOpenChange={(v) => !v && handleClose()}>
                <DialogContent className="sm:max-w-md border-0 bg-transparent shadow-none">
                    <DialogTitle className="hidden">Verificación de identidad</DialogTitle>
                    <Card className="w-full border-0 shadow-2xl overflow-hidden backdrop-blur-3xl bg-white/90 dark:bg-zinc-900/90 ring-1 ring-black/5">
                        <div className="text-center pb-2 pt-6 px-6">
                            <div className="text-2xl font-bold flex flex-col items-center gap-2">
                                {verificationStatus === 'success' ? (
                                    <CheckCircle2 className="h-12 w-12 text-green-500 animate-in zoom-in spin-in-50 duration-500" />
                                ) : verificationStatus === 'failed' ? (
                                    <XCircle className="h-12 w-12 text-red-500 animate-in zoom-in duration-300" />
                                ) : verificationStatus === 'detecting' ? (
                                    <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                                ) : null}
                                <span className="text-lg">
                                    {verificationStatus === 'success' ? 'Identidad Confirmada' :
                                        verificationStatus === 'failed' ? 'Error de Identificación' :
                                            verificationStatus === 'detecting' ? 'Verificando...' :
                                                `Hola, ${selectedEmployee?.first_name || ''}`}
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
                                        verificationStatus === 'success' ? "opacity-50 grayscale" : "opacity-100"
                                    )}
                                />
                                {/* Face guide overlay */}
                                {verificationStatus === 'detecting' && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-40 h-52 border-[3px] border-dashed border-white/50 rounded-[50%]" />
                                    </div>
                                )}
                                {verificationStatus === 'success' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center animate-in fade-in duration-500">
                                        {message.includes('Bienvenido') ? (
                                            <LogIn className="h-20 w-20 text-green-400 mb-2 drop-shadow-lg" />
                                        ) : (
                                            <LogOut className="h-20 w-20 text-orange-400 mb-2 drop-shadow-lg" />
                                        )}
                                        <p className="text-white font-bold text-xl drop-shadow-md text-center px-4">{message}</p>
                                    </div>
                                )}
                                {verificationStatus === 'failed' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 animate-in fade-in">
                                        <p className="text-white font-bold text-center px-4">{message}</p>
                                        <Button onClick={() => {
                                            cancelledRef.current = false;
                                            runVerification(selectedEmployee!, 1);
                                        }} variant="secondary" className="mt-4">
                                            Reintentar
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {verificationStatus === 'detecting' && (
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
