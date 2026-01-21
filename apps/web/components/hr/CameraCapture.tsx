'use client'
import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Camera } from 'lucide-react';
import { loadModels } from '@/lib/face-util';
import { toast } from 'sonner';

interface CameraCaptureProps {
    onCapture: (blob: Blob, descriptor: Float32Array) => void;
}

export function CameraCapture({ onCapture }: CameraCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [loading, setLoading] = useState(true);
    const [detecting, setDetecting] = useState(false);
    const [videoReady, setVideoReady] = useState(false);

    useEffect(() => {
        if (!loading && stream && videoRef.current) {
            console.log("Attaching stream to video element");
            videoRef.current.srcObject = stream;
            // Explicitly call play mostly for Safari/Firefox quirks
            videoRef.current.play().catch(e => console.error("Error playing video:", e));
        }
    }, [loading, stream]);

    useEffect(() => {
        let mounted = true;

        async function init() {
            setLoading(true);
            const modelsLoaded = await loadModels();
            if (!modelsLoaded) {
                toast.error("Error cargando modelos de reconocimiento facial.");
                return;
            }
            if (!mounted) return;

            try {
                const s = await navigator.mediaDevices.getUserMedia({ video: true });
                setStream(s);
                // We stop loading here, which renders the video element.
                // The effect above will then attach the stream.
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

    const capture = async () => {
        if (!videoRef.current || !videoReady) {
            toast.error("La cámara no está lista aún.");
            return;
        }

        setDetecting(true);
        console.log("Starting detection...");

        try {
            // Using significantly smaller input size for performance
            const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

            // Check video validity
            if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
                throw new Error("Video dimensions are zero");
            }

            // Face detection
            const detections = await faceapi.detectSingleFace(videoRef.current, options)
                .withFaceLandmarks()
                .withFaceDescriptor();

            console.log("Detection result:", detections);

            if (!detections) {
                toast.error('No se detectó el rostro. Asegúrese de tener buena iluminación y mirar a la cámara.');
                setDetecting(false);
                return;
            }

            // Capture image
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);

            canvas.toBlob((blob) => {
                if (blob) onCapture(blob, detections.descriptor);
            }, 'image/jpeg', 0.8);
        } catch (e) {
            console.error("Capture error:", e);
            toast.error("Error al procesar la imagen facial.");
        } finally {
            setDetecting(false);
        }
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
                    {detecting && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                            <Loader2 className="animate-spin h-10 w-10 text-white mb-2" />
                            <span className="text-white font-medium text-sm">Analizando rostro...</span>
                        </div>
                    )}
                </div>
            )}
            <Button
                onClick={capture}
                disabled={loading || detecting || !videoReady}
                size="lg"
                className="w-full max-w-xs transition-all hover:scale-105"
            >
                {detecting ? 'Procesando...' : <><Camera className="mr-2 h-4 w-4" /> Capturar Rostro</>}
            </Button>
        </Card>
    )
}
