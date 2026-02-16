'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ClipboardList, Settings, ArrowRight, Coffee } from 'lucide-react';

export default function HRHubPage() {
    const modules = [
        {
            title: 'Gestión de Asistencia',
            description: 'Supervisa turnos, entradas, salidas y tiempos laborados.',
            icon: <ClipboardList className="h-10 w-10 text-blue-500" />,
            href: '/hr/attendance',
            color: 'bg-blue-50 dark:bg-blue-900/10',
            arrowColor: 'text-blue-500'
        },
        {
            title: 'Control de Breaks',
            description: 'Cronómetro en vivo para registrar descansos de operarios.',
            icon: <Coffee className="h-10 w-10 text-orange-500" />,
            href: '/hr/breaks',
            color: 'bg-orange-50 dark:bg-orange-900/10',
            arrowColor: 'text-orange-500'
        },
        {
            title: 'Directorio de Empleados',
            description: 'Registra personal, captura rostros y administra perfiles.',
            icon: <Users className="h-10 w-10 text-purple-500" />,
            href: '/hr/config',
            color: 'bg-purple-50 dark:bg-purple-900/10',
            arrowColor: 'text-purple-500'
        }
    ];

    return (
        <div className="container mx-auto py-12 px-4 max-w-5xl">
            <div className="text-center mb-16 space-y-4">
                <div className="inline-flex items-center justify-center p-3 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                    <Users className="h-8 w-8 text-slate-700 dark:text-slate-200" />
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                    Recursos Humanos
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    Panel centralizado para la administración de personal y control de asistencia biométrico.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {modules.map((module) => (
                    <Link href={module.href} key={module.href} passHref>
                        <Card className="h-full group hover:shadow-2xl transition-all duration-300 border-slate-200 dark:border-slate-800 cursor-pointer overflow-hidden relative">
                            <div className={`absolute top-0 right-0 p-32 rounded-full transform translate-x-12 -translate-y-12 opacity-10 group-hover:scale-110 transition-transform duration-500 ${module.color.replace('50', '500').replace('900/10', '500')}`} />

                            <CardHeader className="flex flex-row items-center gap-6 pb-2">
                                <div className={`p-4 rounded-2xl ${module.color} group-hover:scale-110 transition-transform duration-300`}>
                                    {module.icon}
                                </div>
                                <div className="space-y-1">
                                    <CardTitle className="text-2xl font-bold group-hover:text-primary transition-colors">
                                        {module.title}
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-6">
                                    {module.description}
                                </CardDescription>
                                <div className={`flex items-center font-medium ${module.arrowColor} group-hover:translate-x-2 transition-transform duration-300`}>
                                    Acceder al módulo <ArrowRight className="ml-2 h-4 w-4" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            <div className="mt-12 text-center">
                <p className="text-sm text-muted-foreground">
                    ¿Buscas el Kiosco de Registro?{' '}
                    <Link href="/hr/kiosk" className="text-blue-500 hover:underline font-medium">
                        Abrir Kiosco de Asistencia →
                    </Link>
                </p>
            </div>
        </div>
    );
}
