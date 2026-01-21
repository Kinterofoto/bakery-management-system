'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Loader2, Search, Calendar, LogIn, LogOut, Download, Filter,
    AlertCircle, CheckCircle, Clock, Edit
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

// Update Shift interface
interface Shift {
    id: string; // ID of the entry log
    employeeId: string;
    employeeName: string;
    employeePhoto: string;
    entryTime: Date;
    exitTime: Date | null;
    exitId: string | null; // ID of the exit log
    status: 'completed' | 'ongoing' | 'missing_exit';
    duration: string;
    totalBreakMinutes: number;
    breakCount: number;
}

export default function AttendanceAdminPage() {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [manualExitOpen, setManualExitOpen] = useState(false);
    const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
    const [manualExitTime, setManualExitTime] = useState('');

    useEffect(() => {
        fetchLogsAndProcess();
    }, []);

    const fetchLogsAndProcess = async () => {
        setLoading(true);
        try {
            // Fetch logs AND breaks
            const [logsResult, breaksResult] = await Promise.all([
                supabase.from('attendance_logs')
                    .select('*, employees(id, first_name, last_name, photo_url, name)')
                    .order('timestamp', { ascending: true }),
                supabase.from('employee_breaks')
                    .select('*')
                    .order('start_time', { ascending: true })
            ]);

            if (logsResult.error) throw logsResult.error;
            if (breaksResult.error) throw breaksResult.error;

            const processed = processShifts(logsResult.data || [], breaksResult.data || []);
            setLogs(processed.reverse());
        } catch (error: any) {
            console.error('Error fetching logs:', error);
            toast.error('Error al cargar los registros de asistencia');
        } finally {
            setLoading(false);
        }
    };

    const setLogs = (data: Shift[]) => {
        setShifts(data);
    };

    // Core Logic: Grouping Entries and Exits
    const processShifts = (logs: any[], breaks: any[]): Shift[] => {
        const shifts: Shift[] = [];
        const employeeLogs: Record<string, any[]> = {};

        // 1. Group by Employee
        logs.forEach(log => {
            const empId = log.employee_id;
            if (!employeeLogs[empId]) employeeLogs[empId] = [];
            employeeLogs[empId].push(log);
        });

        // Helper to get breaks for a time range
        const getBreaksForShift = (empId: string, start: Date, end: Date | null) => {
            const shiftBreaks = breaks.filter(b => {
                const bStart = new Date(b.start_time);
                // Break must start after shift start
                if (b.employee_id !== empId) return false;
                if (bStart < start) return false;
                // If shift ended, break start must be before shift end
                if (end && bStart > end) return false;
                // If shift ongoing, break just needs to be recent (e.g. < 24h from start)
                if (!end && differenceInHours(bStart, start) > 24) return false;
                return true;
            });

            const totalMinutes = shiftBreaks.reduce((acc, b) => {
                if (!b.end_time) return acc;
                return acc + differenceInMinutes(new Date(b.end_time), new Date(b.start_time));
            }, 0);

            return { count: shiftBreaks.length, minutes: totalMinutes };
        };

        // 2. Process each employee's timeline
        Object.values(employeeLogs).forEach(userLogs => {
            let currentEntry: any = null;
            let lastExit: any = null;

            userLogs.forEach((log, index) => {
                const logTime = new Date(log.timestamp);

                if (log.type === 'entrada') {
                    if (currentEntry) {
                        const hoursSinceEntry = differenceInHours(logTime, new Date(currentEntry.timestamp));
                        if (hoursSinceEntry > 20) {
                            // Close stale entry properly
                            const entryDate = new Date(currentEntry.timestamp);
                            const breakStats = getBreaksForShift(currentEntry.employees.id, entryDate, null);

                            shifts.push({
                                id: currentEntry.id,
                                employeeId: currentEntry.employee_id,
                                employeeName: `${currentEntry.employees?.first_name} ${currentEntry.employees?.last_name}`,
                                employeePhoto: currentEntry.employees?.photo_url,
                                entryTime: entryDate,
                                exitTime: null,
                                exitId: null,
                                status: 'missing_exit',
                                duration: '-',
                                totalBreakMinutes: breakStats.minutes,
                                breakCount: breakStats.count
                            });
                            currentEntry = log;
                            lastExit = null;
                        }
                    } else {
                        currentEntry = log;
                        lastExit = null;
                    }
                } else if (log.type === 'salida') {
                    if (currentEntry) {
                        lastExit = log;
                    }
                }

                const nextLog = userLogs[index + 1];
                const isLastLog = index === userLogs.length - 1;

                if (currentEntry) {
                    let shouldClose = false;

                    if (isLastLog) {
                        shouldClose = true;
                    } else if (nextLog) {
                        const nextLogTime = new Date(nextLog.timestamp);
                        if (nextLog.type === 'entrada') {
                            const hoursDiff = differenceInHours(nextLogTime, new Date(currentEntry.timestamp));
                            if (hoursDiff > 20) shouldClose = true;
                        }
                    }

                    if (shouldClose) {
                        const entryDate = new Date(currentEntry.timestamp);
                        const exitDate = lastExit ? new Date(lastExit.timestamp) : null;
                        const breakStats = getBreaksForShift(currentEntry.employees.id, entryDate, exitDate);

                        // Calculate duration
                        let duration = '-';
                        let shiftDurationHours = 0;
                        if (exitDate) {
                            const diffMins = differenceInMinutes(exitDate, entryDate);
                            const h = Math.floor(diffMins / 60);
                            const m = diffMins % 60;
                            duration = `${h}h ${m}m`;
                            shiftDurationHours = diffMins / 60;
                        }

                        let status: Shift['status'] = 'ongoing';
                        if (exitDate) status = 'completed';
                        else if (differenceInHours(new Date(), entryDate) > 16) status = 'missing_exit';

                        shifts.push({
                            id: currentEntry.id,
                            employeeId: currentEntry.employees.id,
                            employeeName: `${currentEntry.employees?.first_name} ${currentEntry.employees?.last_name}`,
                            employeePhoto: currentEntry.employees?.photo_url,
                            entryTime: entryDate,
                            exitTime: exitDate,
                            exitId: lastExit?.id || null,
                            status,
                            duration,
                            shiftDurationHours,
                            totalBreakMinutes: breakStats.minutes,
                            breakCount: breakStats.count
                        });

                        currentEntry = null;
                        lastExit = null;
                    }
                }
            });
        });

        return shifts;
    };

    const handleManualExit = async () => {
        if (!selectedShift || !manualExitTime) return;

        try {
            const entryDate = selectedShift.entryTime;
            const [hours, minutes] = manualExitTime.split(':').map(Number);
            let exitDate = new Date(entryDate);
            exitDate.setHours(hours, minutes, 0, 0);

            if (exitDate < entryDate) {
                exitDate.setDate(exitDate.getDate() + 1);
            }

            const { error } = await supabase.from('attendance_logs').insert({
                employee_id: selectedShift.employeeId,
                type: 'salida',
                timestamp: exitDate.toISOString(),
                confidence_score: 1.0,
                photo_url: null
            });

            if (error) throw error;
            toast.success("Salida registrada manualmente");
            setManualExitOpen(false);
            fetchLogsAndProcess();
        } catch (e) {
            console.error(e);
            toast.error("Error al registrar salida");
        }
    };

    const filteredShifts = shifts.filter(s =>
        s.employeeName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const exportToCSV = () => {
        const headers = ["ID Empleado", "Nombre", "Entrada", "Salida", "Duración", "Minutos Break", "Estado"];
        const rows = filteredShifts.map(s => [
            s.employeeId,
            s.employeeName,
            format(s.entryTime, 'yyyy-MM-dd HH:mm:ss'),
            s.exitTime ? format(s.exitTime, 'yyyy-MM-dd HH:mm:ss') : '-',
            s.duration,
            s.totalBreakMinutes,
            s.status
        ]);

        const content = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `asistencia_turnos_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    return (
        <div className="container mx-auto py-10 px-4 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                        Gestión de Turnos
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Visualización de jornadas completas (Entrada → Salida)
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={exportToCSV} className="shadow-sm">
                        <Download className="mr-2 h-4 w-4" /> Exportar CSV
                    </Button>
                    <Button onClick={fetchLogsAndProcess} variant="secondary" className="shadow-sm">
                        <Calendar className="mr-2 h-4 w-4" /> Recargar
                    </Button>
                </div>
            </div>

            <Card className="shadow-xl border-slate-200 dark:border-slate-800">
                <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Filter className="h-5 w-5 text-slate-400" /> Historial de Turnos
                        </CardTitle>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input
                                placeholder="Buscar empleado..."
                                className="pl-10 bg-white dark:bg-slate-950 shadow-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-20 gap-4">
                            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                            <p className="text-muted-foreground animate-pulse">Procesando turnos...</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 pointer-events-none">
                                    <TableHead className="w-[300px] font-bold">Empleado</TableHead>
                                    <TableHead className="font-bold">Entrada</TableHead>
                                    <TableHead className="font-bold">Salida</TableHead>
                                    <TableHead className="font-bold">Duración</TableHead>
                                    <TableHead className="font-bold text-right">Estado</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredShifts.length > 0 ? (
                                    filteredShifts.map((shift) => (
                                        <TableRow key={shift.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10 border-2 border-slate-100 dark:border-slate-800">
                                                        <AvatarImage src={shift.employeePhoto} className="object-cover" />
                                                        <AvatarFallback className="bg-slate-100 dark:bg-slate-800">
                                                            {shift.employeeName.slice(0, 2)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900 dark:text-slate-100">
                                                            {shift.employeeName}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground font-mono">
                                                            ID: {String(shift.employeeId).slice(-6)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-900 dark:text-slate-100">
                                                        {format(shift.entryTime, 'HH:mm')}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {format(shift.entryTime, "d MMM, yyyy", { locale: es })}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {shift.exitTime ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-slate-900 dark:text-slate-100">
                                                            {format(shift.exitTime, 'HH:mm')}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {format(shift.exitTime, "d MMM, yyyy", { locale: es })}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-slate-400 italic">--:--</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-mono text-sm">{shift.duration}</span>
                                                    {shift.breakCount > 0 && (
                                                        <div className={cn(
                                                            "text-xs px-1.5 py-0.5 rounded-md inline-block w-fit font-medium border",
                                                            shift.totalBreakMinutes > 15
                                                                ? "bg-red-50 text-red-700 border-red-200"
                                                                : "bg-blue-50 text-blue-700 border-blue-200"
                                                        )}>
                                                            {shift.totalBreakMinutes}m Breaks
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end">
                                                    {shift.status === 'completed' && (
                                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                                                            <CheckCircle className="h-3 w-3" /> Completado
                                                        </Badge>
                                                    )}
                                                    {shift.status === 'ongoing' && (
                                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1 animate-pulse">
                                                            <Clock className="h-3 w-3" /> En curso
                                                        </Badge>
                                                    )}
                                                    {shift.status === 'missing_exit' && (
                                                        <Badge variant="destructive" className="gap-1">
                                                            <AlertCircle className="h-3 w-3" /> Sin Salida
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {shift.status !== 'completed' && (
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => {
                                                                    setSelectedShift(shift);
                                                                    setManualExitTime('');
                                                                    setManualExitOpen(true);
                                                                }}
                                                            >
                                                                <Edit className="h-4 w-4 text-slate-400 hover:text-blue-500" />
                                                            </Button>
                                                        </DialogTrigger>
                                                    </Dialog>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                                            No se encontraron turnos registrados.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={manualExitOpen} onOpenChange={setManualExitOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Registrar Salida Manualmente</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border">
                            <Avatar>
                                <AvatarImage src={selectedShift?.employeePhoto} />
                                <AvatarFallback>{selectedShift?.employeeName.slice(0, 2)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium">{selectedShift?.employeeName}</p>
                                <p className="text-sm text-muted-foreground">
                                    Entrada: {selectedShift && format(selectedShift.entryTime, "d MMM, HH:mm", { locale: es })}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Hora de Salida</Label>
                            <Input
                                type="time"
                                value={manualExitTime}
                                onChange={(e) => setManualExitTime(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Si la hora es menor a la entrada, se asumirá que es al día siguiente.
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setManualExitOpen(false)}>Cancelar</Button>
                        <Button onClick={handleManualExit} disabled={!manualExitTime}>Guardar Salida</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
