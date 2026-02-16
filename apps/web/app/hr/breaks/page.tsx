'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Search,
    Coffee,
    Play,
    Square,
    Clock,
    History,
    ChevronRight,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInSeconds, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';

// Type definitions
interface Employee {
    id: number;
    first_name: string;
    last_name: string;
    photo_url: string;
    // Helper status for UI
    activeBreakId?: string;
    breakStartTime?: string;
}

interface BreakSession {
    id: string;
    employee_id: number;
    start_time: string;
    end_time: string | null;
}

export default function BreakTrackerPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeBreaks, setActiveBreaks] = useState<BreakSession[]>([]);

    // Timer state for active breaks
    const [timers, setTimers] = useState<Record<string, number>>({});

    // Dialogs
    const [confirmStartOpen, setConfirmStartOpen] = useState(false);
    const [confirmEndOpen, setConfirmEndOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    useEffect(() => {
        fetchData();

        // Interval to update active timers
        const interval = setInterval(() => {
            updateTimers();
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Also update timers whenever activeBreaks changes
    useEffect(() => {
        updateTimers();
    }, [activeBreaks]);

    const fetchData = async () => {
        setLoading(true);
        const today = startOfDay(new Date()).toISOString();

        try {
            // 1. Get Employees
            const { data: empData, error: empError } = await supabase
                .from('employees')
                .select('*')
                .eq('is_active', true)
                .order('first_name');

            if (empError) throw empError;

            // 2. Get Active Breaks (No end_time)
            const { data: breakData, error: breakError } = await supabase
                .from('employee_breaks')
                .select('*')
                .is('end_time', null);

            if (breakError) throw breakError;

            // 3. Determine "In Shift" Status
            // Fetch latest logs for everyone
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const { data: logsData } = await supabase.from('attendance_logs')
                .select('employee_id, type, timestamp')
                .gte('timestamp', yesterday.toISOString())
                .order('timestamp', { ascending: false });

            const statusMap: Record<string, boolean> = {}; // true = in shift

            logsData?.forEach(log => {
                if (statusMap[log.employee_id] === undefined) {
                    statusMap[log.employee_id] = (log.type === 'entrada');
                }
            });

            const parsed = empData?.map(e => ({
                ...e,
                isInShift: statusMap[e.id] || false
            })) || [];

            setActiveBreaks(breakData || []);
            setEmployees(parsed);

        } catch (e) {
            console.error(e);
            toast.error("Error cargando datos");
        } finally {
            setLoading(false);
        }
    };

    const updateTimers = () => {
        setTimers(prev => {
            const next = { ...prev };
            // We read from the ref to activeBreaks ideally, but in React functional
            // we rely on the state dependency or functional update if inside effect.
            // Since we call this from an interval created once, we need access to latest state.
            // Actually, best pattern is to just calculate elapsed time in render.
            // But let's verify activeBreaks in render.
            return next; // forcing re-render basically
        });
        // We actually just need to trigger a re-render.
        // The display logic will calc current time - start_time.
        setTimers(t => ({ ...t, _tick: Date.now() }));
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const startBreak = async () => {
        if (!selectedEmployee) return;

        try {
            const { data, error } = await supabase.from('employee_breaks').insert({
                employee_id: selectedEmployee.id,
                start_time: new Date().toISOString()
            }).select().single();

            if (error) throw error;

            setActiveBreaks(prev => [...prev, data]);
            setConfirmStartOpen(false);
            setSelectedEmployee(null);
            toast.success(`Break iniciado para ${selectedEmployee.first_name}`);
        } catch (e) {
            console.error(e);
            toast.error("Error al iniciar break");
        }
    };

    const endBreak = async () => {
        if (!selectedEmployee || !selectedEmployee.activeBreakId) return;

        try {
            const { error } = await supabase
                .from('employee_breaks')
                .update({ end_time: new Date().toISOString() })
                .eq('id', selectedEmployee.activeBreakId);

            if (error) throw error;

            setActiveBreaks(prev => prev.filter(b => b.id !== selectedEmployee.activeBreakId));
            setConfirmEndOpen(false);
            setSelectedEmployee(null);
            toast.success("Break finalizado");
        } catch (e) {
            console.error(e);
            toast.error("Error al finalizar break");
        }
    };

    // Helper to separate active vs inactive
    const activeEmployeeIds = new Set(activeBreaks.map(b => b.employee_id));

    // Filtered lists
    const employeeList = employees.map(e => {
        const activeBreak = activeBreaks.find(b => b.employee_id === e.id);
        return {
            ...e,
            activeBreakId: activeBreak?.id,
            breakStartTime: activeBreak?.start_time
        };
    }).filter(e => {
        const fullName = `${e.first_name} ${e.last_name}`.toLowerCase();
        return fullName.includes(searchQuery.toLowerCase());
    });

    // Only show active employees in the "Available" list. 
    // Employees currently ON break are already shown in the top section regardless of shift status (though they should be in shift).
    const activeList = employeeList.filter(e => e.activeBreakId);

    // For available list, MUST be in shift AND not on break
    const inactiveList = employeeList.filter(e => !e.activeBreakId && e.isInShift);


    // Initial Loading State
    if (loading && employees.length === 0) {
        return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-blue-500" /></div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 font-sans">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 sticky top-0 z-10 border-b shadow-sm px-4 py-4 md:px-6">
                <div className="max-w-4xl mx-auto flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                                <Coffee className="h-6 w-6 text-orange-500" /> Control de Breaks
                            </h1>
                            <p className="text-sm text-muted-foreground">Supervisor de Planta</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={fetchData}>
                            <History className="h-5 w-5 text-slate-500" />
                        </Button>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input
                            placeholder="Buscar operario..."
                            className="pl-10 h-12 text-lg bg-slate-100 dark:bg-slate-800 border-none rounded-xl"
                            value={searchQuery}
                            onChange={handleSearch}
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 space-y-8">

                {/* Active Breaks Section */}
                {activeList.length > 0 && (
                    <section>
                        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                            <Clock className="h-5 w-5 text-blue-500 animate-pulse" /> En Break ({activeList.length})
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {activeList.map(emp => (
                                <Card
                                    key={emp.id}
                                    onClick={() => { setSelectedEmployee(emp); setConfirmEndOpen(true); }}
                                    className="border-l-4 border-l-blue-500 shadow-md cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 active:scale-95 transition-all"
                                >
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-12 w-12 border-2 border-blue-100">
                                                <AvatarImage src={emp.photo_url} />
                                                <AvatarFallback>{emp.first_name[0]}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-bold text-lg">{emp.first_name}</p>
                                                <p className="text-sm text-muted-foreground font-mono">
                                                    <Timer start={emp.breakStartTime!} tick={timers['_tick']} />
                                                </p>
                                            </div>
                                        </div>
                                        <div className="h-10 w-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600">
                                            <Square className="h-4 w-4 fill-current" />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </section>
                )}

                {/* Inactive List Section */}
                <section>
                    <h2 className="text-lg font-semibold mb-3 text-slate-700 dark:text-slate-300">
                        Personal Disponible
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {inactiveList.map(emp => (
                            <Card
                                key={emp.id}
                                onClick={() => { setSelectedEmployee(emp); setConfirmStartOpen(true); }}
                                className="shadow-sm cursor-pointer hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 active:bg-slate-50 transition-all border-l-4 border-l-transparent hover:border-l-green-500"
                            >
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={emp.photo_url} />
                                            <AvatarFallback className="bg-slate-200">{emp.first_name[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">{emp.first_name} {emp.last_name}</p>
                                            <p className="text-xs text-muted-foreground">Operario</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-slate-300" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    {inactiveList.length === 0 && searchQuery && (
                        <div className="text-center py-10 text-muted-foreground">No se encontraron empleados.</div>
                    )}
                </section>
            </div>

            {/* Start Break Dialog */}
            <Dialog open={confirmStartOpen} onOpenChange={setConfirmStartOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Iniciar Break</DialogTitle>
                        <DialogDescription>
                            ¿Confirmar inicio de descanso para <strong>{selectedEmployee?.first_name}</strong>?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center py-4">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={selectedEmployee?.photo_url} />
                            <AvatarFallback>{selectedEmployee?.first_name[0]}</AvatarFallback>
                        </Avatar>
                    </div>
                    <DialogFooter className="flex-row gap-2 justify-end">
                        <Button variant="outline" className="flex-1" onClick={() => setConfirmStartOpen(false)}>Cancelar</Button>
                        <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={startBreak}>
                            <Play className="mr-2 h-4 w-4 fill-current" /> Iniciar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* End Break Dialog */}
            <Dialog open={confirmEndOpen} onOpenChange={setConfirmEndOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Terminar Break</DialogTitle>
                        <DialogDescription>
                            El tiempo transcurrido se registrará automáticamente.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center py-4 gap-2">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={selectedEmployee?.photo_url} />
                            <AvatarFallback>{selectedEmployee?.first_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="text-3xl font-mono font-bold text-slate-800 dark:text-white">
                            {selectedEmployee?.breakStartTime && (
                                <Timer start={selectedEmployee.breakStartTime} tick={timers['_tick']} />
                            )}
                        </div>
                        <p className="text-sm text-green-600 font-medium">En progreso</p>
                    </div>
                    <DialogFooter className="flex-row gap-2 justify-end">
                        <Button variant="outline" className="flex-1" onClick={() => setConfirmEndOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" className="flex-1" onClick={endBreak}>
                            <Square className="mr-2 h-4 w-4 fill-current" /> Terminar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}

// Simple Timer Component
function Timer({ start, tick }: { start: string, tick: any }) {
    if (!start) return null;

    // We force re-calc using 'tick' prop which changes every second
    const diff = differenceInSeconds(new Date(), new Date(start));

    // Format mm:ss or hh:mm:ss
    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    const secs = diff % 60;

    const fmt = (n: number) => n.toString().padStart(2, '0');

    if (hours > 0) return `${fmt(hours)}:${fmt(mins)}:${fmt(secs)}`;
    return `${fmt(mins)}:${fmt(secs)}`;
}
