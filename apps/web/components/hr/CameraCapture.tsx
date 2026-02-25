'use client'
import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Camera } from 'lucide-react';
import { toast } from 'sonner';

interface CameraCaptureProps {
    onCapture: (blob: Blob) => void;
}

export function CameraCapture({ onCapture }: CameraCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [loading, setLoading] = useState(true);
    const [videoReady, setVideoReady] = useState(false);

    useEffect(() => {
        if (!loading && stream && videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.error("Error playing video:", e));
        }
    }, [loading, stream]);

    useEffect(() => {
        let mounted = true;

        async function init() {
            setLoading(true);
            try {
                const s = await navigator.mediaDevices.getUserMedia({ video: true });
                if (!mounted) {
                    s.getTracks().forEach(t => t.stop());
                    return;
                }
                setStream(s);
                setLoading(false);
            } catch (err) {
                console.error(err);
                toast.error("No se pudo acceder a la cámara.");
                setLoading(false);
            }
        }
        init();

        return () => {
            mounted = false;
        }
    }, []);

    // Cleanup stream on unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(t => t.stop());
            }
        }
    }, [stream]);

    const handleVideoPlay = () => {
        setVideoReady(true);
    };

    const capture = () => {
        if (!videoRef.current || !videoReady) {
            toast.error("La cámara no está lista aún.");
            return;
        }

        if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
            toast.error("Error: dimensiones del video inválidas.");
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);

        canvas.toBlob((blob) => {
            if (blob) onCapture(blob);
        }, 'image/jpeg', 0.8);
    };

    return (
        <Card className="p-4 flex flex-col items-center gap-4 bg-white/5 border-none shadow-none w-full">
            {loading ? (
                <div className="h-[300px] w-full flex items-center justify-center bg-gray-100 dark:bg-zinc-800 rounded-lg">
                    <Loader2 className="animate-spin h-8 w-8 text-gray-400" />
                </div>
            ) : (
                <div className="relative rounded-lg overflow-hidden shadow-2xl ring-4 ring-white/10 w-full max-w-md bg-black">
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        onPlay={handleVideoPlay}
                        onLoadedMetadata={handleVideoPlay}
                        className="w-full h-full md:h-[300px] object-cover transform scale-x-[-1]"
                    />
                    {!videoReady && !loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-white">
                            <Loader2 className="animate-spin h-6 w-6 mr-2" /> Iniciando cámara...
                        </div>
                    )}
                </div>
            )}
            <Button
                onClick={capture}
                disabled={loading || !videoReady}
                size="lg"
                className="w-full max-w-xs transition-all hover:scale-105"
            >
                <Camera className="mr-2 h-4 w-4" /> Capturar Rostro
            </Button>
        </Card>
    )
}
