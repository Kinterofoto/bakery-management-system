'use client'

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
    format, differenceInHours, differenceInMinutes, startOfWeek, endOfWeek,
    startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addDays, subDays,
    addWeeks, subWeeks, addMonths, subMonths, isToday, startOfDay, endOfDay,
    parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Loader2, Search, CalendarIcon, Download, ChevronLeft, ChevronRight,
    AlertCircle, CheckCircle, Clock, Edit, Users, Timer, TrendingUp,
    BarChart3, ArrowLeft, LayoutList, GanttChart, Coffee, Sun, Moon
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';

// ─── Types ───────────────────────────────────────────────────────────
interface Shift {
    id: string;
    employeeId: string;
    employeeName: string;
    employeePhoto: string;
    entryTime: Date;
    exitTime: Date | null;
    exitId: string | null;
    status: 'completed' | 'ongoing' | 'missing_exit' | 'absent';
    duration: string;
    rawDuration: string;
    shiftDurationHours: number;
    totalBreakMinutes: number;
    breakCount: number;
    excessBreakMinutes: number;
    netMinutes: number;
}

type ViewMode = 'timeline' | 'table';
type PeriodType = 'day' | 'week' | 'month' | 'custom';

// ─── Timeline Constants ──────────────────────────────────────────────
const TIMELINE_START_HOUR = 5; // 5 AM
const TIMELINE_END_HOUR = 24; // Midnight
const TOTAL_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR;

// ─── Utility: Hour position as percentage ────────────────────────────
function timeToPercent(date: Date): number {
    const hours = date.getHours() + date.getMinutes() / 60;
    const clamped = Math.max(TIMELINE_START_HOUR, Math.min(TIMELINE_END_HOUR, hours));
    return ((clamped - TIMELINE_START_HOUR) / TOTAL_HOURS) * 100;
}

// ─── Component ───────────────────────────────────────────────────────
export default function AttendanceAdminPage() {
    const router = useRouter();
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [allEmployees, setAllEmployees] = useState<Array<{ id: string; name: string; photo: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('timeline');
    const [period, setPeriod] = useState<PeriodType>('week');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [manualExitOpen, setManualExitOpen] = useState(false);
    const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
    const [manualExitTime, setManualExitTime] = useState('');

    // ─── Date Range ──────────────────────────────────────────────────
    const dateRange = useMemo(() => {
        if (period === 'day') {
            return { start: startOfDay(selectedDate), end: endOfDay(selectedDate) };
        } else if (period === 'week') {
            return {
                start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
                end: endOfWeek(selectedDate, { weekStartsOn: 1 }),
            };
        } else if (period === 'month') {
            return {
                start: startOfMonth(selectedDate),
                end: endOfMonth(selectedDate),
            };
        } else {
            // custom range
            const from = customRange?.from ?? selectedDate;
            const to = customRange?.to ?? customRange?.from ?? selectedDate;
            return { start: startOfDay(from), end: endOfDay(to) };
        }
    }, [selectedDate, period, customRange]);

    const daysInRange = useMemo(() =>
        eachDayOfInterval({ start: dateRange.start, end: dateRange.end }),
        [dateRange]
    );

    // ─── Navigation ──────────────────────────────────────────────────
    const navigate = (dir: 'prev' | 'next') => {
        if (period === 'custom') {
            const from = customRange?.from;
            const to = customRange?.to ?? from;
            if (!from || !to) return;
            const lengthDays = Math.max(1, Math.round((endOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000) + 1);
            const delta = dir === 'prev' ? -lengthDays : lengthDays;
            const newFrom = addDays(from, delta);
            const newTo = addDays(to, delta);
            setCustomRange({ from: newFrom, to: newTo });
            setSelectedDate(newFrom);
            return;
        }
        const fn = dir === 'prev'
            ? period === 'day' ? subDays : period === 'week' ? subWeeks : subMonths
            : period === 'day' ? addDays : period === 'week' ? addWeeks : addMonths;
        setSelectedDate(fn(selectedDate, 1));
    };

    const goToToday = () => {
        const today = new Date();
        setSelectedDate(today);
        if (period === 'custom') {
            setCustomRange({ from: today, to: today });
        }
    };

    // ─── Fetch Data ──────────────────────────────────────────────────
    const fetchLogsAndProcess = useCallback(async () => {
        setLoading(true);
        try {
            const [logsResult, breaksResult] = await Promise.all([
                supabase.from('attendance_logs')
                    .select('*, employees(id, first_name, last_name, photo_url, name)')
                    .gte('timestamp', dateRange.start.toISOString())
                    .lte('timestamp', dateRange.end.toISOString())
                    .order('timestamp', { ascending: true }),
                supabase.from('employee_breaks')
                    .select('*')
                    .gte('start_time', dateRange.start.toISOString())
                    .lte('start_time', dateRange.end.toISOString())
                    .order('start_time', { ascending: true })
            ]);

            if (logsResult.error) throw logsResult.error;
            if (breaksResult.error) throw breaksResult.error;

            const processed = processShifts(logsResult.data || [], breaksResult.data || []);
            setShifts(processed.reverse());
        } catch (error: any) {
            console.error('Error fetching logs:', error);
            toast.error('Error al cargar los registros de asistencia');
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        fetchLogsAndProcess();
    }, [fetchLogsAndProcess]);

    // ─── Fetch active employees (for absence detection) ──────────────
    useEffect(() => {
        (async () => {
            const { data, error } = await supabase
                .from('employees')
                .select('id, first_name, last_name, name, photo_url')
                .eq('is_active', true);
            if (error) {
                console.error('Error fetching employees:', error);
                return;
            }
            const mapped = (data || []).map((e: any) => ({
                id: String(e.id),
                name: e.first_name && e.last_name
                    ? `${e.first_name} ${e.last_name}`
                    : (e.name || 'Sin nombre'),
                photo: e.photo_url || '',
            }));
            setAllEmployees(mapped);
        })();
    }, []);

    // ─── Process shifts ──────────────────────────────────────────────
    const processShifts = (logs: any[], breaks: any[]): Shift[] => {
        const result: Shift[] = [];
        const employeeLogs: Record<string, any[]> = {};

        logs.forEach(log => {
            const empId = log.employee_id;
            if (!employeeLogs[empId]) employeeLogs[empId] = [];
            employeeLogs[empId].push(log);
        });

        const getBreaksForShift = (empId: string, start: Date, end: Date | null) => {
            const shiftBreaks = breaks.filter(b => {
                const bStart = new Date(b.start_time);
                if (b.employee_id !== empId) return false;
                if (bStart < start) return false;
                if (end && bStart > end) return false;
                if (!end && differenceInHours(bStart, start) > 24) return false;
                return true;
            });
            const totalMinutes = shiftBreaks.reduce((acc, b) => {
                if (!b.end_time) return acc;
                return acc + differenceInMinutes(new Date(b.end_time), new Date(b.start_time));
            }, 0);
            return { count: shiftBreaks.length, minutes: totalMinutes };
        };

        Object.values(employeeLogs).forEach(userLogs => {
            let currentEntry: any = null;
            let lastExit: any = null;

            userLogs.forEach((log, index) => {
                const logTime = new Date(log.timestamp);

                if (log.type === 'entrada') {
                    if (currentEntry) {
                        const hoursSinceEntry = differenceInHours(logTime, new Date(currentEntry.timestamp));
                        if (hoursSinceEntry > 20) {
                            const entryDate = new Date(currentEntry.timestamp);
                            const breakStats = getBreaksForShift(currentEntry.employees.id, entryDate, null);
                            result.push({
                                id: currentEntry.id,
                                employeeId: currentEntry.employee_id,
                                employeeName: `${currentEntry.employees?.first_name} ${currentEntry.employees?.last_name}`,
                                employeePhoto: currentEntry.employees?.photo_url,
                                entryTime: entryDate,
                                exitTime: null,
                                exitId: null,
                                status: 'missing_exit',
                                duration: '-',
                                rawDuration: '-',
                                shiftDurationHours: 0,
                                totalBreakMinutes: breakStats.minutes,
                                breakCount: breakStats.count,
                                excessBreakMinutes: 0,
                                netMinutes: 0,
                            });
                            currentEntry = log;
                            lastExit = null;
                        }
                    } else {
                        currentEntry = log;
                        lastExit = null;
                    }
                } else if (log.type === 'salida') {
                    if (currentEntry) lastExit = log;
                }

                const nextLog = userLogs[index + 1];
                const isLastLog = index === userLogs.length - 1;

                if (currentEntry) {
                    let shouldClose = false;
                    if (isLastLog) {
                        shouldClose = true;
                    } else if (nextLog?.type === 'entrada') {
                        const hoursDiff = differenceInHours(new Date(nextLog.timestamp), new Date(currentEntry.timestamp));
                        if (hoursDiff > 20) shouldClose = true;
                    }

                    if (shouldClose) {
                        const entryDate = new Date(currentEntry.timestamp);
                        const exitDate = lastExit ? new Date(lastExit.timestamp) : null;
                        const breakStats = getBreaksForShift(currentEntry.employees.id, entryDate, exitDate);

                        let duration = '-';
                        let rawDuration = '-';
                        let shiftDurationHours = 0;
                        let excessBreakMinutes = 0;
                        let netMinutes = 0;

                        if (exitDate) {
                            const diffMins = differenceInMinutes(exitDate, entryDate);
                            shiftDurationHours = diffMins / 60;
                            const allowedBreakMinutes = shiftDurationHours >= 10 ? 75 : 15;
                            excessBreakMinutes = Math.max(0, breakStats.minutes - allowedBreakMinutes);
                            netMinutes = Math.max(0, diffMins - excessBreakMinutes);
                            const h = Math.floor(netMinutes / 60);
                            const m = netMinutes % 60;
                            duration = `${h}h ${m}m`;
                            const rh = Math.floor(diffMins / 60);
                            const rm = diffMins % 60;
                            rawDuration = `${rh}h ${rm}m`;
                        } else {
                            shiftDurationHours = differenceInHours(new Date(), entryDate);
                            netMinutes = differenceInMinutes(new Date(), entryDate);
                        }

                        let status: Shift['status'] = 'ongoing';
                        if (exitDate) status = 'completed';
                        else if (differenceInHours(new Date(), entryDate) > 16) status = 'missing_exit';

                        result.push({
                            id: currentEntry.id,
                            employeeId: currentEntry.employees.id,
                            employeeName: `${currentEntry.employees?.first_name} ${currentEntry.employees?.last_name}`,
                            employeePhoto: currentEntry.employees?.photo_url,
                            entryTime: entryDate,
                            exitTime: exitDate,
                            exitId: lastExit?.id || null,
                            status,
                            duration,
                            rawDuration,
                            shiftDurationHours,
                            totalBreakMinutes: breakStats.minutes,
                            breakCount: breakStats.count,
                            excessBreakMinutes,
                            netMinutes,
                        });

                        currentEntry = null;
                        lastExit = null;
                    }
                }
            });
        });

        return result;
    };

    // ─── Absent shifts (past days only, no marking) ──────────────────
    const absentShifts = useMemo<Shift[]>(() => {
        if (allEmployees.length === 0) return [];
        const todayStart = startOfDay(new Date());
        const result: Shift[] = [];
        daysInRange.forEach(day => {
            // Only past days — not today, not future
            if (day >= todayStart) return;
            const dayShifts = shifts.filter(s => isSameDay(s.entryTime, day));
            const presentIds = new Set(dayShifts.map(s => String(s.employeeId)));
            allEmployees.forEach(emp => {
                if (presentIds.has(emp.id)) return;
                // Place marker around 11am for visual consistency on the timeline
                const marker = new Date(day);
                marker.setHours(11, 0, 0, 0);
                result.push({
                    id: `absent-${emp.id}-${format(day, 'yyyy-MM-dd')}`,
                    employeeId: emp.id,
                    employeeName: emp.name,
                    employeePhoto: emp.photo,
                    entryTime: marker,
                    exitTime: null,
                    exitId: null,
                    status: 'absent',
                    duration: '-',
                    rawDuration: '-',
                    shiftDurationHours: 0,
                    totalBreakMinutes: 0,
                    breakCount: 0,
                    excessBreakMinutes: 0,
                    netMinutes: 0,
                });
            });
        });
        return result;
    }, [shifts, allEmployees, daysInRange]);

    // ─── Filtered Shifts ─────────────────────────────────────────────
    const filteredShifts = useMemo(() => {
        return shifts.filter(s => {
            if (searchQuery && !s.employeeName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            if (statusFilter !== 'all' && s.status !== statusFilter) return false;
            return true;
        });
    }, [shifts, searchQuery, statusFilter]);

    const filteredAbsent = useMemo(() => {
        // Absent entries only show when filter is 'all' or 'absent'
        if (statusFilter !== 'all' && statusFilter !== 'absent') return [];
        return absentShifts.filter(s => {
            if (searchQuery && !s.employeeName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });
    }, [absentShifts, searchQuery, statusFilter]);

    // ─── Stats ───────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const uniqueEmployees = new Set(filteredShifts.map(s => s.employeeId));
        const completed = filteredShifts.filter(s => s.status === 'completed');
        const ongoing = filteredShifts.filter(s => s.status === 'ongoing');
        const totalNetMinutes = completed.reduce((acc, s) => acc + s.netMinutes, 0);
        const avgHours = completed.length > 0 ? (totalNetMinutes / completed.length / 60) : 0;

        return {
            totalShifts: filteredShifts.length,
            uniqueEmployees: uniqueEmployees.size,
            avgHours: avgHours.toFixed(1),
            ongoingCount: ongoing.length,
            completedCount: completed.length,
            absentCount: filteredAbsent.length,
        };
    }, [filteredShifts, filteredAbsent]);

    // ─── Shifts grouped by day for timeline ──────────────────────────
    const shiftsByDay = useMemo(() => {
        const map: Record<string, Shift[]> = {};
        daysInRange.forEach(day => {
            const key = format(day, 'yyyy-MM-dd');
            const real = filteredShifts.filter(s => isSameDay(s.entryTime, day));
            const absent = filteredAbsent.filter(s => isSameDay(s.entryTime, day));
            // Real shifts first (so working employees render at the top), absent last
            map[key] = [...real, ...absent];
        });
        return map;
    }, [filteredShifts, filteredAbsent, daysInRange]);

    // ─── Unique employees in filtered range ──────────────────────────
    const uniqueEmployeeList = useMemo(() => {
        const map = new Map<string, { id: string; name: string; photo: string }>();
        filteredShifts.forEach(s => {
            if (!map.has(s.employeeId)) {
                map.set(s.employeeId, { id: s.employeeId, name: s.employeeName, photo: s.employeePhoto });
            }
        });
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredShifts]);

    // ─── Manual Exit Handler ─────────────────────────────────────────
    const handleManualExit = async () => {
        if (!selectedShift || !manualExitTime) return;
        try {
            const entryDate = selectedShift.entryTime;
            const [hours, minutes] = manualExitTime.split(':').map(Number);
            let exitDate = new Date(entryDate);
            exitDate.setHours(hours, minutes, 0, 0);
            if (exitDate < entryDate) exitDate.setDate(exitDate.getDate() + 1);

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

    // ─── CSV Export ──────────────────────────────────────────────────
    const exportToCSV = () => {
        const headers = ["Empleado", "Entrada", "Salida", "Duración Neta", "Breaks (min)", "Estado"];
        const rows = filteredShifts.map(s => [
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
        link.setAttribute("download", `asistencia_${format(dateRange.start, 'yyyy-MM-dd')}_${format(dateRange.end, 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ─── Period Label ────────────────────────────────────────────────
    const periodLabel = useMemo(() => {
        if (period === 'day') return format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es });
        if (period === 'week') {
            return `${format(dateRange.start, "d MMM", { locale: es })} – ${format(dateRange.end, "d MMM, yyyy", { locale: es })}`;
        }
        if (period === 'month') return format(selectedDate, "MMMM yyyy", { locale: es });
        // custom range
        if (isSameDay(dateRange.start, dateRange.end)) {
            return format(dateRange.start, "EEEE d 'de' MMMM, yyyy", { locale: es });
        }
        return `${format(dateRange.start, "d MMM", { locale: es })} – ${format(dateRange.end, "d MMM, yyyy", { locale: es })}`;
    }, [period, selectedDate, dateRange]);

    // ─── Timeline hour labels ────────────────────────────────────────
    const timelineHours = useMemo(() => {
        const hours = [];
        for (let h = TIMELINE_START_HOUR; h <= TIMELINE_END_HOUR; h++) {
            hours.push(h);
        }
        return hours;
    }, []);

    // ─── Render ──────────────────────────────────────────────────────
    return (
        <TooltipProvider>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
                <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-5">

                    {/* ── Header ─────────────────────────────────────── */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost" size="icon"
                                onClick={() => router.push('/hr')}
                                className="rounded-full"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                    Asistencia
                                </h1>
                                <p className="text-sm text-slate-500 capitalize">{periodLabel}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={exportToCSV}>
                                <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
                            </Button>
                        </div>
                    </div>

                    {/* ── Stats Cards ────────────────────────────────── */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <StatCard
                            icon={<Users className="h-4 w-4" />}
                            label="Empleados"
                            value={stats.uniqueEmployees}
                            color="blue"
                        />
                        <StatCard
                            icon={<BarChart3 className="h-4 w-4" />}
                            label="Turnos"
                            value={stats.totalShifts}
                            color="slate"
                        />
                        <StatCard
                            icon={<TrendingUp className="h-4 w-4" />}
                            label="Promedio"
                            value={`${stats.avgHours}h`}
                            color="emerald"
                        />
                        <StatCard
                            icon={<Clock className="h-4 w-4" />}
                            label="En curso"
                            value={stats.ongoingCount}
                            color="amber"
                        />
                        <StatCard
                            icon={<AlertCircle className="h-4 w-4" />}
                            label="Ausentes"
                            value={stats.absentCount}
                            color="red"
                        />
                    </div>

                    {/* ── Toolbar ────────────────────────────────────── */}
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-sm">

                        {/* Period selector */}
                        <Select
                            value={period}
                            onValueChange={(v) => {
                                const next = v as PeriodType;
                                setPeriod(next);
                                if (next === 'custom' && !customRange?.from) {
                                    setCustomRange({ from: selectedDate, to: selectedDate });
                                }
                            }}
                        >
                            <SelectTrigger className="w-[130px] h-9 text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="day">Diario</SelectItem>
                                <SelectItem value="week">Semanal</SelectItem>
                                <SelectItem value="month">Mensual</SelectItem>
                                <SelectItem value="custom">Rango</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Date navigation */}
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate('prev')}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>

                            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-9 gap-1.5 text-sm font-medium min-w-[140px]">
                                        <CalendarIcon className="h-3.5 w-3.5" />
                                        {period === 'custom' && customRange?.from
                                            ? customRange.to && !isSameDay(customRange.from, customRange.to)
                                                ? `${format(customRange.from, 'dd MMM', { locale: es })} – ${format(customRange.to, 'dd MMM yyyy', { locale: es })}`
                                                : format(customRange.from, 'dd MMM yyyy', { locale: es })
                                            : format(selectedDate, 'dd MMM yyyy', { locale: es })}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    {period === 'custom' ? (
                                        <Calendar
                                            mode="range"
                                            selected={customRange}
                                            onSelect={(range) => {
                                                setCustomRange(range);
                                                if (range?.from) setSelectedDate(range.from);
                                                if (range?.from && range?.to) setCalendarOpen(false);
                                            }}
                                            numberOfMonths={2}
                                            locale={es}
                                        />
                                    ) : (
                                        <Calendar
                                            mode="single"
                                            selected={selectedDate}
                                            onSelect={(d) => { if (d) { setSelectedDate(d); setCalendarOpen(false); } }}
                                            locale={es}
                                        />
                                    )}
                                </PopoverContent>
                            </Popover>

                            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate('next')}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>

                            <Button
                                variant="secondary" size="sm"
                                className="h-9 text-xs font-semibold ml-1"
                                onClick={goToToday}
                            >
                                Hoy
                            </Button>
                        </div>

                        <div className="hidden md:block h-6 w-px bg-slate-200 dark:bg-zinc-700" />

                        {/* Search */}
                        <div className="relative flex-1 min-w-[180px]">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                                placeholder="Buscar empleado..."
                                className="pl-8 h-9 text-sm bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Status filter */}
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[140px] h-9 text-sm">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="completed">Completados</SelectItem>
                                <SelectItem value="ongoing">En curso</SelectItem>
                                <SelectItem value="missing_exit">Sin salida</SelectItem>
                                <SelectItem value="absent">Ausentes</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="hidden md:block h-6 w-px bg-slate-200 dark:bg-zinc-700" />

                        {/* View toggle */}
                        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                            <TabsList className="h-9">
                                <TabsTrigger value="timeline" className="text-xs gap-1.5 px-3">
                                    <GanttChart className="h-3.5 w-3.5" /> Timeline
                                </TabsTrigger>
                                <TabsTrigger value="table" className="text-xs gap-1.5 px-3">
                                    <LayoutList className="h-3.5 w-3.5" /> Tabla
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    {/* ── Content ────────────────────────────────────── */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            <p className="text-sm text-slate-400">Cargando turnos...</p>
                        </div>
                    ) : viewMode === 'timeline' ? (
                        <TimelineView
                            daysInRange={daysInRange}
                            shiftsByDay={shiftsByDay}
                            timelineHours={timelineHours}
                            uniqueEmployees={uniqueEmployeeList}
                            period={period}
                        />
                    ) : (
                        <TableView
                            shifts={[...filteredShifts, ...filteredAbsent]}
                            onManualExit={(shift) => {
                                setSelectedShift(shift);
                                setManualExitTime('');
                                setManualExitOpen(true);
                            }}
                        />
                    )}
                </div>

                {/* ── Manual Exit Dialog ─────────────────────────────── */}
                <Dialog open={manualExitOpen} onOpenChange={setManualExitOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Registrar Salida Manual</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-zinc-800 rounded-lg border">
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
                                    Si la hora es menor a la entrada, se asumirá el día siguiente.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setManualExitOpen(false)}>Cancelar</Button>
                            <Button onClick={handleManualExit} disabled={!manualExitTime}>Guardar</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
}

// ─── Stat Card Component ─────────────────────────────────────────────
function StatCard({ icon, label, value, color }: {
    icon: React.ReactNode; label: string; value: string | number;
    color: 'blue' | 'slate' | 'emerald' | 'amber' | 'red'
}) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
        slate: 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400',
        emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
        amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
        red: 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400',
    };
    return (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", colors[color])}>{icon}</div>
                <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                </div>
            </div>
        </div>
    );
}

// ─── Timeline View Component ─────────────────────────────────────────
function TimelineView({ daysInRange, shiftsByDay, timelineHours, uniqueEmployees, period }: {
    daysInRange: Date[];
    shiftsByDay: Record<string, Shift[]>;
    timelineHours: number[];
    uniqueEmployees: { id: string; name: string; photo: string }[];
    period: PeriodType;
}) {
    return (
        <div className="space-y-2">
            {daysInRange.map(day => {
                const key = format(day, 'yyyy-MM-dd');
                const dayShifts = shiftsByDay[key] || [];
                const today = isToday(day);

                const workingShifts = dayShifts.filter(s => s.status !== 'absent');
                const absentShiftsForDay = dayShifts.filter(s => s.status === 'absent');
                const workingEmployeeCount = new Set(workingShifts.map(s => s.employeeId)).size;

                // Group shifts by employee for this day
                const employeeShiftsMap: Record<string, Shift[]> = {};
                dayShifts.forEach(s => {
                    if (!employeeShiftsMap[s.employeeId]) employeeShiftsMap[s.employeeId] = [];
                    employeeShiftsMap[s.employeeId].push(s);
                });

                const employeeIds = Object.keys(employeeShiftsMap);

                return (
                    <div
                        key={key}
                        className={cn(
                            "bg-white dark:bg-zinc-900 border rounded-xl overflow-hidden shadow-sm transition-all",
                            today
                                ? "border-blue-300 dark:border-blue-800 ring-1 ring-blue-200 dark:ring-blue-900"
                                : "border-slate-200 dark:border-zinc-800"
                        )}
                    >
                        {/* Day header */}
                        <div className={cn(
                            "flex items-center gap-3 px-4 py-2.5 border-b",
                            today
                                ? "bg-blue-50/80 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900"
                                : "bg-slate-50/80 dark:bg-zinc-800/50 border-slate-100 dark:border-zinc-800"
                        )}>
                            <div className={cn(
                                "flex flex-col items-center justify-center w-12 h-12 rounded-lg text-center",
                                today
                                    ? "bg-blue-600 text-white"
                                    : "bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                            )}>
                                <span className="text-xs font-medium leading-none opacity-80">
                                    {format(day, 'EEE', { locale: es }).toUpperCase()}
                                </span>
                                <span className="text-lg font-bold leading-tight">
                                    {format(day, 'd')}
                                </span>
                            </div>
                            <div className="flex-1">
                                <p className={cn(
                                    "text-sm font-semibold capitalize",
                                    today ? "text-blue-900 dark:text-blue-200" : "text-slate-700 dark:text-slate-300"
                                )}>
                                    {format(day, "EEEE", { locale: es })}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {workingShifts.length} turno{workingShifts.length !== 1 ? 's' : ''}
                                    {workingShifts.length > 0 && ` · ${workingEmployeeCount} empleado${workingEmployeeCount !== 1 ? 's' : ''}`}
                                    {absentShiftsForDay.length > 0 && (
                                        <span className="text-red-500 font-medium">
                                            {' · '}{absentShiftsForDay.length} ausente{absentShiftsForDay.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </p>
                            </div>
                            {today && (
                                <Badge className="bg-blue-600 text-white border-0 text-[10px] px-2 py-0.5">
                                    HOY
                                </Badge>
                            )}
                        </div>

                        {/* Timeline grid */}
                        {employeeIds.length > 0 ? (
                            <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                                {employeeIds.map(empId => {
                                    const empShifts = employeeShiftsMap[empId];
                                    const emp = empShifts[0];
                                    const isAbsentRow = empShifts.every(s => s.status === 'absent');

                                    return (
                                        <div key={empId} className="flex items-stretch hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                            {/* Employee label */}
                                            <div className="w-[180px] shrink-0 flex items-center gap-2.5 px-4 py-2.5 border-r border-slate-100 dark:border-zinc-800">
                                                <Avatar className={cn(
                                                    "h-7 w-7 ring-1",
                                                    isAbsentRow
                                                        ? "ring-red-200 dark:ring-red-900/50 grayscale opacity-75"
                                                        : "ring-slate-200 dark:ring-zinc-700"
                                                )}>
                                                    <AvatarImage src={emp.employeePhoto} className="object-cover" />
                                                    <AvatarFallback className="text-[10px] bg-slate-100 dark:bg-zinc-800">
                                                        {emp.employeeName.slice(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className={cn(
                                                    "text-xs font-medium truncate",
                                                    isAbsentRow
                                                        ? "text-red-600 dark:text-red-400"
                                                        : "text-slate-700 dark:text-slate-300"
                                                )}>
                                                    {emp.employeeName.split(' ').slice(0, 2).join(' ')}
                                                </span>
                                            </div>

                                            {/* Timeline bar area */}
                                            <div className="flex-1 relative min-h-[44px] overflow-hidden">
                                                {/* Hour grid lines */}
                                                {timelineHours.map(h => (
                                                    <div
                                                        key={h}
                                                        className="absolute top-0 bottom-0 border-l border-slate-100 dark:border-zinc-800/60"
                                                        style={{ left: `${((h - TIMELINE_START_HOUR) / TOTAL_HOURS) * 100}%` }}
                                                    />
                                                ))}

                                                {/* Now indicator */}
                                                {today && (() => {
                                                    const now = new Date();
                                                    const pct = timeToPercent(now);
                                                    return (
                                                        <div
                                                            className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-20 opacity-70"
                                                            style={{ left: `${pct}%` }}
                                                        >
                                                            <div className="absolute -top-0.5 -left-1 w-2 h-2 rounded-full bg-red-500" />
                                                        </div>
                                                    );
                                                })()}

                                                {/* Shift blocks */}
                                                {empShifts.map(shift => {
                                                    // Absent marker — thin red vertical bar
                                                    if (shift.status === 'absent') {
                                                        const pct = timeToPercent(shift.entryTime);
                                                        return (
                                                            <Tooltip key={shift.id}>
                                                                <TooltipTrigger asChild>
                                                                    <div
                                                                        className="absolute top-2 bottom-2 w-1 rounded-full bg-red-500/90 dark:bg-red-500/80 cursor-pointer hover:w-1.5 hover:brightness-110 transition-all z-10"
                                                                        style={{ left: `${pct}%` }}
                                                                    />
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top" className="max-w-[220px]">
                                                                    <div className="space-y-1">
                                                                        <p className="font-semibold text-xs">{shift.employeeName}</p>
                                                                        <p className="text-xs text-red-500 flex items-center gap-1">
                                                                            <AlertCircle className="h-3 w-3" />
                                                                            Sin marcación de asistencia
                                                                        </p>
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        );
                                                    }

                                                    const startPct = timeToPercent(shift.entryTime);
                                                    const endTime = shift.exitTime || new Date();
                                                    const endPct = timeToPercent(endTime);
                                                    const width = Math.max(0.5, endPct - startPct);

                                                    const statusColors: Record<Exclude<Shift['status'], 'absent'>, string> = {
                                                        completed: 'bg-emerald-400/80 dark:bg-emerald-500/70',
                                                        ongoing: 'bg-blue-400/80 dark:bg-blue-500/70 animate-pulse',
                                                        missing_exit: 'bg-red-400/80 dark:bg-red-500/70',
                                                    };

                                                    return (
                                                        <Tooltip key={shift.id}>
                                                            <TooltipTrigger asChild>
                                                                <div
                                                                    className={cn(
                                                                        "absolute top-2 bottom-2 rounded-md cursor-pointer transition-all hover:brightness-110 hover:scale-y-110 z-10",
                                                                        statusColors[shift.status as Exclude<Shift['status'], 'absent'>],
                                                                    )}
                                                                    style={{
                                                                        left: `${startPct}%`,
                                                                        width: `${width}%`,
                                                                    }}
                                                                >
                                                                    {/* Inner label if wide enough */}
                                                                    {width > 5 && (
                                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                                            <span className="text-[10px] font-bold text-white drop-shadow-sm truncate px-1">
                                                                                {shift.duration !== '-' ? shift.duration : 'En curso'}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top" className="max-w-[220px]">
                                                                <div className="space-y-1">
                                                                    <p className="font-semibold text-xs">{shift.employeeName}</p>
                                                                    <div className="flex items-center gap-2 text-xs">
                                                                        <Sun className="h-3 w-3 text-amber-500" />
                                                                        {format(shift.entryTime, 'HH:mm')}
                                                                        <span className="text-slate-400">→</span>
                                                                        <Moon className="h-3 w-3 text-indigo-400" />
                                                                        {shift.exitTime ? format(shift.exitTime, 'HH:mm') : '--:--'}
                                                                    </div>
                                                                    <p className="text-xs text-slate-500">
                                                                        Duración: <span className="font-medium text-slate-700 dark:text-slate-300">{shift.duration}</span>
                                                                    </p>
                                                                    {shift.breakCount > 0 && (
                                                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                                                            <Coffee className="h-3 w-3" /> {shift.totalBreakMinutes}m breaks
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Hour labels at bottom */}
                                <div className="flex items-stretch">
                                    <div className="w-[180px] shrink-0 border-r border-slate-100 dark:border-zinc-800" />
                                    <div className="flex-1 relative h-6">
                                        {timelineHours.filter((_, i) => i % 2 === 0).map(h => (
                                            <span
                                                key={h}
                                                className="absolute text-[9px] text-slate-400 font-mono -translate-x-1/2"
                                                style={{ left: `${((h - TIMELINE_START_HOUR) / TOTAL_HOURS) * 100}%`, top: '4px' }}
                                            >
                                                {h === 24 ? '00' : String(h).padStart(2, '0')}:00
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="px-4 py-6 text-center text-xs text-slate-400">
                                Sin registros
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Table View Component ────────────────────────────────────────────
function TableView({ shifts, onManualExit }: {
    shifts: Shift[];
    onManualExit: (shift: Shift) => void;
}) {
    return (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50/80 dark:bg-zinc-800/50">
                        <TableHead className="w-[260px] font-semibold text-xs">Empleado</TableHead>
                        <TableHead className="font-semibold text-xs">Entrada</TableHead>
                        <TableHead className="font-semibold text-xs">Salida</TableHead>
                        <TableHead className="font-semibold text-xs">Duración</TableHead>
                        <TableHead className="font-semibold text-xs">Breaks</TableHead>
                        <TableHead className="font-semibold text-xs text-right">Estado</TableHead>
                        <TableHead className="w-[40px]" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {shifts.length > 0 ? shifts.map((shift) => {
                        const isAbsent = shift.status === 'absent';
                        return (
                        <TableRow
                            key={shift.id}
                            className={cn(
                                "transition-colors",
                                isAbsent
                                    ? "bg-red-50/40 hover:bg-red-50/70 dark:bg-red-950/10 dark:hover:bg-red-950/20"
                                    : "hover:bg-slate-50/50 dark:hover:bg-zinc-800/30"
                            )}
                        >
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar className={cn(
                                        "h-9 w-9 ring-1",
                                        isAbsent
                                            ? "ring-red-200 dark:ring-red-900/50 grayscale opacity-75"
                                            : "ring-slate-100 dark:ring-zinc-800"
                                    )}>
                                        <AvatarImage src={shift.employeePhoto} className="object-cover" />
                                        <AvatarFallback className="text-[10px] bg-slate-100 dark:bg-zinc-800">
                                            {shift.employeeName.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className={cn(
                                            "text-sm font-semibold",
                                            isAbsent
                                                ? "text-red-600 dark:text-red-400"
                                                : "text-slate-900 dark:text-slate-100"
                                        )}>
                                            {shift.employeeName}
                                        </p>
                                        {isAbsent && (
                                            <p className="text-[11px] text-red-500/80">
                                                {format(shift.entryTime, "d 'de' MMMM, yyyy", { locale: es })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                {isAbsent ? (
                                    <span className="text-sm text-red-400">—</span>
                                ) : (
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{format(shift.entryTime, 'HH:mm')}</span>
                                        <span className="text-[11px] text-slate-400">{format(shift.entryTime, "d MMM", { locale: es })}</span>
                                    </div>
                                )}
                            </TableCell>
                            <TableCell>
                                {isAbsent ? (
                                    <span className="text-sm text-red-400">—</span>
                                ) : shift.exitTime ? (
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{format(shift.exitTime, 'HH:mm')}</span>
                                        <span className="text-[11px] text-slate-400">{format(shift.exitTime, "d MMM", { locale: es })}</span>
                                    </div>
                                ) : (
                                    <span className="text-sm text-slate-300">--:--</span>
                                )}
                            </TableCell>
                            <TableCell>
                                {isAbsent ? (
                                    <span className="text-sm text-red-400">—</span>
                                ) : (
                                    <>
                                        <span className="text-sm font-mono font-semibold">{shift.duration}</span>
                                        {shift.excessBreakMinutes > 0 && (
                                            <span className="text-[10px] text-red-500 ml-1">(-{shift.excessBreakMinutes}m)</span>
                                        )}
                                    </>
                                )}
                            </TableCell>
                            <TableCell>
                                {isAbsent ? (
                                    <span className="text-[11px] text-red-300">—</span>
                                ) : shift.breakCount > 0 ? (
                                    <div className={cn(
                                        "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium",
                                        shift.totalBreakMinutes > (shift.shiftDurationHours >= 10 ? 75 : 15)
                                            ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                                            : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400"
                                    )}>
                                        <Coffee className="h-3 w-3" />
                                        {shift.totalBreakMinutes}m
                                    </div>
                                ) : (
                                    <span className="text-[11px] text-slate-300">—</span>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                <StatusBadge status={shift.status} />
                            </TableCell>
                            <TableCell>
                                {shift.status !== 'completed' && shift.status !== 'absent' && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onManualExit(shift)}>
                                        <Edit className="h-3.5 w-3.5 text-slate-400 hover:text-blue-500" />
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                        );
                    }) : (
                        <TableRow>
                            <TableCell colSpan={7} className="h-32 text-center text-sm text-slate-400">
                                No se encontraron turnos en este período.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

// ─── Status Badge ────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Shift['status'] }) {
    if (status === 'completed') {
        return (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800 gap-1 text-[11px]">
                <CheckCircle className="h-3 w-3" /> Completado
            </Badge>
        );
    }
    if (status === 'ongoing') {
        return (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800 gap-1 text-[11px] animate-pulse">
                <Clock className="h-3 w-3" /> En curso
            </Badge>
        );
    }
    if (status === 'absent') {
        return (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800 gap-1 text-[11px]">
                <AlertCircle className="h-3 w-3" /> Ausente
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800 gap-1 text-[11px]">
            <AlertCircle className="h-3 w-3" /> Sin salida
        </Badge>
    );
}
