'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, ClipboardList, ArrowRight, Coffee, ChevronLeft, MonitorSmartphone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function HRHubPage() {
    const router = useRouter();
    const { hasPermission } = useAuth();

    const allModules = [
        {
            title: 'Asistencia',
            description: 'Turnos, entradas y salidas.',
            icon: <ClipboardList className="h-5 w-5" />,
            href: '/hr/attendance',
            color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400',
            permission: 'hr_attendance' as const,
        },
        {
            title: 'Breaks',
            description: 'Descansos de operarios.',
            icon: <Coffee className="h-5 w-5" />,
            href: '/hr/breaks',
            color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-400',
            permission: 'hr_breaks' as const,
        },
        {
            title: 'Directorio',
            description: 'Personal y perfiles.',
            icon: <Users className="h-5 w-5" />,
            href: '/hr/config',
            color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400',
            permission: 'hr_directory' as const,
        },
        {
            title: 'Kiosco',
            description: 'Registro biométrico.',
            icon: <MonitorSmartphone className="h-5 w-5" />,
            href: '/hr/kiosk',
            color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400',
            permission: 'hr_kiosk' as const,
        },
    ];

    // @ts-ignore - permissions type is optional but always present at runtime
    const modules = allModules.filter(m => hasPermission(m.permission));

    return (
        <div className="h-screen flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-2xl">
                {/* Back */}
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors mb-8"
                >
                    <ChevronLeft className="h-4 w-4" /> Módulos
                </button>

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recursos Humanos</h1>
                    <p className="text-sm text-gray-500 mt-1">Administración de personal y asistencia</p>
                </div>

                {/* Modules grid */}
                <div className="grid grid-cols-2 gap-3">
                    {modules.map((m) => (
                        <Link key={m.href} href={m.href}>
                            <div className="group border border-gray-200 dark:border-zinc-800 rounded-xl p-4 hover:shadow-lg hover:border-gray-300 dark:hover:border-zinc-600 transition-all cursor-pointer">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`p-2 rounded-lg ${m.color}`}>
                                        {m.icon}
                                    </div>
                                    <span className="font-semibold text-gray-900 dark:text-white">{m.title}</span>
                                </div>
                                <p className="text-xs text-gray-500 mb-3">{m.description}</p>
                                <div className="flex items-center text-xs font-medium text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    Abrir <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
