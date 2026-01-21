'use client'

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import * as faceapi from 'face-api.js';
import { loadModels } from '@/lib/face-util';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, LogIn, LogOut, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function HRKioskPage() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
    const [verificationStatus, setVerificationStatus] = useState<'idle' | 'detecting' | 'success' | 'failed'>('idle');
    const [message, setMessage] = useState('');

    // Camera Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    // Kiosk Redesign & Active Status Updates
    const loadData = async () => {
        await loadModels();

        // 1. Fetch Employees
        const { data: employeesData } = await supabase.from('employees').select('*').eq('is_active', true).order('first_name');

        // 2. Fetch Latest Logs (to determine who is 'in shift')
        // We look for logs in the last ~24h to avoid extremely old stale data affecting status
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const { data: logsData } = await supabase.from('attendance_logs')
            .select('employee_id, type, timestamp')
            .gte('timestamp', yesterday.toISOString())
            .order('timestamp', { ascending: false });

        if (employeesData) {
            // Create a map of status
            const statusMap: Record<string, boolean> = {}; // true = in shift

            logsData?.forEach(log => {
                if (statusMap[log.employee_id] === undefined) {
                    // First log encountered is the latest one
                    statusMap[log.employee_id] = (log.type === 'entrada');
                }
            });

            const parsed = employeesData.map(e => ({
                ...e,
                face_descriptor: e.face_descriptor ? new Float32Array(e.face_descriptor) : null,
                isInShift: statusMap[e.id] || false
            }));

            setEmployees(parsed);
        }
        setLoading(false);
    };

    // Close handler
    const handleClose = () => {
        stopCamera();
        setSelectedEmployee(null);
        setVerificationStatus('idle');
        setMessage('');
    };

    // Attach stream to video when ready
    useEffect(() => {
        if (stream && videoRef.current) {
            console.log("Kiosk: Attaching stream to video");
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.error("Kiosk play error:", e));
        }
    }, [stream, selectedEmployee]); // re-run when dialog opens (selectedEmployee) or stream changes

    // Camera Logic
    const startCamera = async () => {
        try {
            console.log("Kiosk: Requesting camera...");
            const s = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = s;
            setStream(s);
            setVerificationStatus('detecting');
            startDetection();
        } catch (e) {
            console.error(e);
            toast.error("No se pudo acceder a la cámara");
            handleClose();
        }
    };

    const stopCamera = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    };

    const startDetection = () => {
        if (!selectedEmployee?.face_descriptor) {
            setMessage("Este empleado no tiene datos faciales configurados.");
            return;
        }

        let failureCount = 0;

        intervalRef.current = setInterval(async () => {
            if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

            try {
                // Detect face
                const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
                const detection = await faceapi.detectSingleFace(videoRef.current, options).withFaceLandmarks().withFaceDescriptor();

                if (detection) {
                    // Compare
                    const distance = faceapi.euclideanDistance(detection.descriptor, selectedEmployee.face_descriptor);
                    console.log("Distance:", distance);

                    if (distance < 0.5) { // Threshold
                        handleSuccess(selectedEmployee);
                        stopCamera(); // Stop immediately
                    } else {
                        // Wrong person?
                        failureCount++;
                        if (failureCount > 20) { // Timeout/Fail after ~2-4 seconds of wrong face
                            setVerificationStatus('failed');
                            setMessage("No se reconoce el rostro. Intente de nuevo.");
                            stopCamera();
                        }
                    }
                }
            } catch (e) {
                console.error("Detection error", e);
            }
        }, 500); // Check every 500ms
    };

    const handleSuccess = async (employee: any) => {
        setVerificationStatus('success');

        // Check last log to decide type
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

        // Register
        await supabase.from('attendance_logs').insert({
            employee_id: employee.id,
            type: type,
            timestamp: new Date().toISOString(),
            confidence_score: 1.0 // Mock or actual distance
        });

        setMessage(type === 'entrada' ? `¡Bienvenido, ${employee.first_name}!` : `¡Hasta luego, ${employee.first_name}!`);

        // Close after 2.5s
        setTimeout(() => {
            handleClose();
            // Reload data to update dots
            loadData();
        }, 2500);
    };

    useEffect(() => {
        if (selectedEmployee) {
            // Wait for dialog animation
            setTimeout(startCamera, 100);
        }
        return () => stopCamera();
    }, [selectedEmployee]);

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
                        <CardHeader className="text-center pb-2">
                            <CardTitle className="text-2xl font-bold flex flex-col items-center gap-2">
                                {verificationStatus === 'success' ? (
                                    <CheckCircle2 className="h-12 w-12 text-green-500 animate-in zoom-in spin-in-50 duration-500" />
                                ) : verificationStatus === 'failed' ? (
                                    <XCircle className="h-12 w-12 text-red-500 animate-in zoom-in duration-300" />
                                ) : (
                                    <div className="h-12 w-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                                )}
                                <span>
                                    {verificationStatus === 'success' ? 'Identidad Confirmada' :
                                        verificationStatus === 'failed' ? 'Error de Identificación' :
                                            'Verificando Identidad...'}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center p-6 pt-2">

                            <div className="relative rounded-2xl overflow-hidden shadow-2xl w-full aspect-[4/3] bg-black">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    muted
                                    className={cn(
                                        "w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-500",
                                        verificationStatus === 'success' ? "opacity-50 grayscale" : "opacity-100"
                                    )}
                                />
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
                                        <Button onClick={() => { setVerificationStatus('detecting'); startDetection(); }} variant="secondary" className="mt-4">
                                            Reintentar
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <p className="text-center text-sm text-muted-foreground mt-4">
                                Por favor mire directamente a la cámara para registrar su asistencia.
                            </p>
                        </CardContent>
                    </Card>
                </DialogContent>
            </Dialog>
        </div>
    )
}
