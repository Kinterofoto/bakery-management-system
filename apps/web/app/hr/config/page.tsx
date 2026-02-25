'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CameraCapture } from '@/components/hr/CameraCapture';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Plus, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function HRConfigPage() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);

    // Form state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [capturedImage, setCapturedImage] = useState<Blob | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        const { data } = await supabase.from('employees').select('*').order('created_at', { ascending: false });
        if (data) setEmployees(data);
        setLoading(false);
    }

    const handleCapture = (blob: Blob) => {
        setCapturedImage(blob);
    };

    const handleSave = async () => {
        if (!firstName || !lastName || !capturedImage) {
            toast.error("Por favor complete todos los campos y tome la foto.");
            return;
        }
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('image', capturedImage, 'capture.jpg');
            formData.append('first_name', firstName);
            formData.append('last_name', lastName);

            const res = await fetch(`${API_URL}/api/hr/enroll`, {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                const errorMsg = data?.detail?.message || data?.detail?.error || 'Error al registrar empleado';
                throw new Error(errorMsg);
            }

            toast.success(`Empleado registrado (embedding ${data.embedding_dim}D)`);

            // Reset
            setFirstName('');
            setLastName('');
            setCapturedImage(null);
            setOpen(false);
            fetchEmployees();
        } catch (e: any) {
            console.error(e);
            toast.error("Error al guardar empleado: " + e.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
                        <Users className="text-blue-600" /> Directorio de Empleados
                    </h1>
                    <p className="text-muted-foreground mt-1">Gestión de personal y configuración de reconocimiento facial</p>
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20">
                            <UserPlus className="mr-2 h-4 w-4" /> Nuevo Empleado
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-2xl">Registrar Nuevo Empleado</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-4">
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Nombre</Label>
                                        <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Ej. Juan" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Apellido</Label>
                                        <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Ej. Pérez" />
                                    </div>
                                </div>
                                {capturedImage ? (
                                    <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-800 text-center flex flex-col items-center gap-2">
                                        <div className="h-10 w-10 text-2xl flex items-center justify-center bg-green-100 dark:bg-green-800 rounded-full">✓</div>
                                        <span className="font-semibold">Rostro capturado correctamente</span>
                                        <Button variant="ghost" size="sm" onClick={() => setCapturedImage(null)} className="text-sm underline text-green-700 dark:text-green-400">
                                            Volver a capturar
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 text-yellow-800 dark:text-yellow-500 rounded-lg border border-yellow-200 dark:border-yellow-800 text-sm">
                                        Por favor capture el rostro del empleado para habilitar el reconocimiento facial.
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col items-center bg-gray-50 dark:bg-zinc-900/50 p-6 rounded-xl border">
                                <Label className="mb-4 text-lg font-medium">Foto de Configuración</Label>
                                {!capturedImage ? (
                                    <CameraCapture onCapture={handleCapture} />
                                ) : (
                                    <img
                                        src={URL.createObjectURL(capturedImage)}
                                        className="rounded-lg shadow-lg w-full max-w-md aspect-video object-cover ring-2 ring-green-500"
                                    />
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSave} disabled={uploading}>
                                {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Guardar Empleado
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-blue-500" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {employees.map(emp => (
                        <Card key={emp.id} className="hover:shadow-xl transition-all duration-300 border bg-gradient-to-br from-white to-gray-50 dark:from-zinc-900 dark:to-black">
                            <CardHeader className="flex flex-col items-center gap-4 pb-6 pt-6">
                                <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                                    <AvatarImage src={emp.photo_url} className="object-cover" />
                                    <AvatarFallback className="text-2xl">{emp.first_name?.[0]}{emp.last_name?.[0]}</AvatarFallback>
                                </Avatar>
                                <div className="text-center space-y-1">
                                    <CardTitle className="text-xl font-bold">{emp.first_name} {emp.last_name}</CardTitle>
                                    <CardDescription className="flex items-center justify-center gap-1.5">
                                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                        Activo
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="text-center pb-6">
                                <p className="text-xs text-muted-foreground font-mono">ID: {String(emp.id).slice(0, 8)}...</p>
                            </CardContent>
                        </Card>
                    ))}
                    {employees.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground gap-4 border-2 border-dashed rounded-xl">
                            <Users className="h-10 w-10 opacity-20" />
                            <p>No hay empleados registrados.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
