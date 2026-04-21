'use client'

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
    Loader2, CheckCircle2, XCircle, AlertTriangle, ScanSearch,
    UserX, Calendar as CalIcon, RefreshCw, Eye, FlaskConical, Play, Trophy,
    MonitorSmartphone,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────
interface Candidate {
    id: number;
    name: string;
    sim: number;
}

interface Employee {
    id: number;
    first_name: string | null;
    last_name: string | null;
    photo_url: string | null;
}

interface ReviewRecord {
    kind: 'success' | 'failure';
    id: string;
    timestamp: string;
    // Success-only
    employee_id?: number;
    employee?: Employee | null;
    type?: 'entrada' | 'salida' | string;
    // Failure-only
    reason?: string;
    best_similarity?: number | null;
    // Shared
    similarity: number | null;
    margin: number | null;
    photo_url: string | null;
    top_candidates: Candidate[] | null;
    review_status: string | null;
    correct_employee_id: number | null;
    reviewed_at: string | null;
    reviewed_notes: string | null;
}

type KindFilter = 'successes' | 'failures' | 'all';
type ReviewFilter = 'all' | 'pending' | 'risk' | 'labeled' | 'incorrect';

const THRESHOLD_LOW_SIM = 0.55;
const THRESHOLD_LOW_MARGIN = 0.08;

// ── Helpers ──────────────────────────────────────────────────────────
function riskLevel(sim: number | null, margin: number | null, kind: 'success' | 'failure'): 'red' | 'amber' | 'green' | 'gray' {
    if (kind === 'failure') return 'red';
    if (margin !== null && margin < THRESHOLD_LOW_MARGIN) return 'red';
    if (sim !== null && sim < THRESHOLD_LOW_SIM) return 'amber';
    if (sim !== null && margin !== null) return 'green';
    return 'gray';
}

function riskLabel(level: 'red' | 'amber' | 'green' | 'gray'): string {
    switch (level) {
        case 'red': return 'Riesgo alto';
        case 'amber': return 'Confianza baja';
        case 'green': return 'OK';
        default: return '—';
    }
}

function riskBorderClass(level: 'red' | 'amber' | 'green' | 'gray'): string {
    switch (level) {
        case 'red': return 'ring-2 ring-red-400/60';
        case 'amber': return 'ring-2 ring-amber-400/60';
        case 'green': return 'ring-1 ring-emerald-300/40';
        default: return 'ring-1 ring-slate-200';
    }
}

function reasonLabel(reason: string | undefined): string {
    switch (reason) {
        case 'no_face_detected': return 'No detectó rostro';
        case 'below_threshold': return 'Bajo umbral';
        case 'ambiguous': return 'Ambiguo';
        case 'multiple_faces': return 'Múltiples rostros';
        case 'no_candidates': return 'Sin candidatos';
        default: return reason || '—';
    }
}

// ── Component ────────────────────────────────────────────────────────
export function RecognitionReview() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // URL-driven filters (per AGENTS.md convention).
    const kindFilter = (searchParams.get('kind') as KindFilter) || 'all';
    const reviewFilter = (searchParams.get('review') as ReviewFilter) || 'all';
    const employeeFilter = searchParams.get('emp') || '';
    const daysBack = parseInt(searchParams.get('days') || '7', 10);

    const updateParam = useCallback((key: string, value: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === null || value === '') params.delete(key);
        else params.set(key, value);
        router.replace(`${pathname}?${params.toString()}`);
    }, [router, pathname, searchParams]);

    const [records, setRecords] = useState<ReviewRecord[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [previewRecord, setPreviewRecord] = useState<ReviewRecord | null>(null);
    const [labelingRecord, setLabelingRecord] = useState<ReviewRecord | null>(null);
    const [labelingChoice, setLabelingChoice] = useState<string | null>(null);

    // Evaluation state
    const [evalOpen, setEvalOpen] = useState(false);
    const [evalThreshold, setEvalThreshold] = useState(0.5);
    const [evalMinMargin, setEvalMinMargin] = useState(0.08);
    const [evalScope, setEvalScope] = useState<'labeled' | 'all'>('labeled');
    const [evalDays, setEvalDays] = useState(21);
    const [evalRunning, setEvalRunning] = useState(false);
    const [evalResult, setEvalResult] = useState<any | null>(null);

    // Load employees for the ground-truth dropdown.
    useEffect(() => {
        (async () => {
            const { data } = await supabase
                .from('employees')
                .select('id, first_name, last_name, photo_url')
                .eq('is_active', true)
                .order('first_name');
            setEmployees((data ?? []) as Employee[]);
        })();
    }, []);

    const employeesById = useMemo(() => {
        const m = new Map<number, Employee>();
        employees.forEach(e => m.set(e.id, e));
        return m;
    }, [employees]);

    const loadRecords = useCallback(async () => {
        setLoading(true);
        const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
        const wantSuccesses = kindFilter !== 'failures';
        const wantFailures = kindFilter !== 'successes';

        const [successes, failures] = await Promise.all([
            wantSuccesses
                ? supabase.from('attendance_logs')
                    .select(`
                        id, timestamp, employee_id, type, confidence_score, margin,
                        photo_url, top_candidates, review_status, correct_employee_id,
                        reviewed_at, reviewed_notes
                    `)
                    .gte('timestamp', since)
                    .not('photo_url', 'is', null)
                    .order('timestamp', { ascending: false })
                    .limit(500)
                : Promise.resolve({ data: [] as any[] }),
            wantFailures
                ? supabase.from('attendance_recognition_failures')
                    .select(`
                        id, timestamp, reason, best_similarity, margin,
                        photo_url, top_candidates, review_status, correct_employee_id,
                        reviewed_at, reviewed_notes
                    `)
                    .gte('timestamp', since)
                    .order('timestamp', { ascending: false })
                    .limit(500)
                : Promise.resolve({ data: [] as any[] }),
        ]);

        const successRecords: ReviewRecord[] = (successes.data ?? []).map((r: any) => ({
            kind: 'success',
            id: r.id,
            timestamp: r.timestamp,
            employee_id: r.employee_id,
            type: r.type,
            similarity: r.confidence_score ?? null,
            margin: r.margin ?? null,
            photo_url: r.photo_url,
            top_candidates: (r.top_candidates ?? null) as Candidate[] | null,
            review_status: r.review_status ?? null,
            correct_employee_id: r.correct_employee_id ?? null,
            reviewed_at: r.reviewed_at ?? null,
            reviewed_notes: r.reviewed_notes ?? null,
        }));

        const failureRecords: ReviewRecord[] = (failures.data ?? []).map((r: any) => ({
            kind: 'failure',
            id: r.id,
            timestamp: r.timestamp,
            reason: r.reason,
            best_similarity: r.best_similarity,
            similarity: r.best_similarity ?? null,
            margin: r.margin ?? null,
            photo_url: r.photo_url,
            top_candidates: (r.top_candidates ?? null) as Candidate[] | null,
            review_status: r.review_status ?? null,
            correct_employee_id: r.correct_employee_id ?? null,
            reviewed_at: r.reviewed_at ?? null,
            reviewed_notes: r.reviewed_notes ?? null,
        }));

        const merged = [...successRecords, ...failureRecords]
            .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
        setRecords(merged);
        setLoading(false);
    }, [kindFilter, daysBack]);

    useEffect(() => { loadRecords(); }, [loadRecords]);

    const filtered = useMemo(() => {
        return records.filter(r => {
            // Review-status filter
            if (reviewFilter === 'pending' && r.review_status !== null) return false;
            if (reviewFilter === 'labeled' && r.review_status === null) return false;
            if (reviewFilter === 'incorrect' && r.review_status !== 'incorrect') return false;
            if (reviewFilter === 'risk') {
                const level = riskLevel(r.similarity, r.margin, r.kind);
                if (level !== 'red' && level !== 'amber') return false;
            }
            // Employee filter (only applies to successes where employee_id is known)
            if (employeeFilter) {
                const eid = parseInt(employeeFilter, 10);
                if (r.kind === 'success' && r.employee_id !== eid) return false;
                if (r.kind === 'failure' && r.correct_employee_id !== eid) return false;
            }
            return true;
        });
    }, [records, reviewFilter, employeeFilter]);

    const counts = useMemo(() => {
        const pending = records.filter(r => r.review_status === null).length;
        const risk = records.filter(r => {
            const level = riskLevel(r.similarity, r.margin, r.kind);
            return level === 'red' || level === 'amber';
        }).length;
        return { total: records.length, pending, risk };
    }, [records]);

    const employeeOptions = useMemo(() => ([
        ...employees.map(e => ({
            value: String(e.id),
            label: `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim() || `#${e.id}`,
        })),
    ]), [employees]);

    // ── Labeling actions ─────────────────────────────────────────────
    const markCorrect = async (r: ReviewRecord) => {
        const table = r.kind === 'success' ? 'attendance_logs' : 'attendance_recognition_failures';
        const reviewValue = r.kind === 'success' ? 'correct' : 'confirmed_no_match';
        const { error } = await supabase
            .from(table)
            .update({
                review_status: reviewValue,
                correct_employee_id: null,
                reviewed_at: new Date().toISOString(),
            })
            .eq('id', r.id);
        if (error) {
            console.error(error);
            toast.error('No se pudo guardar la etiqueta');
            return;
        }
        toast.success(r.kind === 'success' ? 'Marcado como correcto' : 'Confirmado sin match');
        loadRecords();
    };

    const openIncorrectDialog = (r: ReviewRecord) => {
        setLabelingRecord(r);
        setLabelingChoice(r.correct_employee_id ? String(r.correct_employee_id) : null);
    };

    const submitIncorrect = async () => {
        if (!labelingRecord) return;
        const r = labelingRecord;
        const table = r.kind === 'success' ? 'attendance_logs' : 'attendance_recognition_failures';
        const reviewValue = r.kind === 'success' ? 'incorrect' : 'should_have_matched';
        const correctId = labelingChoice ? parseInt(labelingChoice, 10) : null;
        const { error } = await supabase
            .from(table)
            .update({
                review_status: reviewValue,
                correct_employee_id: correctId,
                reviewed_at: new Date().toISOString(),
            })
            .eq('id', r.id);
        if (error) {
            console.error(error);
            toast.error('No se pudo guardar la etiqueta');
            return;
        }
        toast.success('Etiqueta guardada');
        setLabelingRecord(null);
        setLabelingChoice(null);
        loadRecords();
    };

    // Force the kiosk device(s) to hard-reset: flushes browser caches,
    // unregisters service workers and reloads. Useful when a kiosk is still
    // serving an old JS bundle and we can't get to it physically.
    const remoteReloadKiosk = async () => {
        const confirmed = window.confirm(
            'Esto va a reiniciar el kiosco inmediatamente (interrumpe cualquier marcación en curso). ¿Continuar?'
        );
        if (!confirmed) return;
        const channel = supabase.channel('kiosk:control');
        await new Promise<void>((resolve) => {
            channel.subscribe((status) => {
                if (status === 'SUBSCRIBED') resolve();
            });
            setTimeout(resolve, 3000);
        });
        const res = await channel.send({ type: 'broadcast', event: 'hard_reset', payload: {} });
        await supabase.removeChannel(channel);
        if (res === 'ok') toast.success('Señal enviada al kiosco');
        else toast.error('No se pudo enviar la señal');
    };

    const runEvaluation = async () => {
        setEvalRunning(true);
        setEvalResult(null);
        try {
            const res = await fetch(`${API_URL}/api/hr/evaluate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    threshold: evalThreshold,
                    min_margin: evalMinMargin,
                    scope: evalScope,
                    days: evalDays,
                }),
            });
            if (!res.ok) {
                const err = await res.text();
                toast.error(`Error en evaluación: ${err.slice(0, 120)}`);
                return;
            }
            const data = await res.json();
            setEvalResult(data);
        } catch (e: any) {
            toast.error(`Error de conexión: ${e.message}`);
        } finally {
            setEvalRunning(false);
        }
    };

    const clearReview = async (r: ReviewRecord) => {
        const table = r.kind === 'success' ? 'attendance_logs' : 'attendance_recognition_failures';
        await supabase
            .from(table)
            .update({
                review_status: null,
                correct_employee_id: null,
                reviewed_at: null,
            })
            .eq('id', r.id);
        loadRecords();
    };

    // ── Render ───────────────────────────────────────────────────────
    return (
        <div className="space-y-4">
            {/* Summary + quick filters */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
                <Badge variant="secondary" className="gap-1.5">
                    <ScanSearch className="h-3.5 w-3.5" /> {counts.total} registros
                </Badge>
                <Badge variant="outline" className="gap-1.5 border-amber-400 text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" /> {counts.risk} de riesgo
                </Badge>
                <Badge variant="outline" className="gap-1.5">
                    <Eye className="h-3.5 w-3.5" /> {counts.pending} por revisar
                </Badge>

                <div className="ml-auto flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={remoteReloadKiosk} className="gap-1.5">
                        <MonitorSmartphone className="h-3.5 w-3.5" /> Reiniciar kiosco
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEvalOpen(true)} className="gap-1.5">
                        <FlaskConical className="h-3.5 w-3.5" /> Evaluar parámetros
                    </Button>
                    <Button variant="ghost" size="sm" onClick={loadRecords} className="gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5" /> Actualizar
                    </Button>
                </div>
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 dark:bg-zinc-900/40 rounded-lg border">
                <Tabs value={kindFilter} onValueChange={(v) => updateParam('kind', v === 'all' ? null : v)}>
                    <TabsList className="h-9">
                        <TabsTrigger value="all" className="text-xs px-3">Todos</TabsTrigger>
                        <TabsTrigger value="successes" className="text-xs px-3 gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Éxitos
                        </TabsTrigger>
                        <TabsTrigger value="failures" className="text-xs px-3 gap-1.5">
                            <XCircle className="h-3.5 w-3.5" /> Fallos
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="h-6 w-px bg-slate-200 dark:bg-zinc-700" />

                <Select value={reviewFilter} onValueChange={(v) => updateParam('review', v === 'all' ? null : v)}>
                    <SelectTrigger className="h-9 w-[170px] text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Estado: todos</SelectItem>
                        <SelectItem value="pending">Por revisar</SelectItem>
                        <SelectItem value="labeled">Etiquetados</SelectItem>
                        <SelectItem value="risk">Solo de riesgo</SelectItem>
                        <SelectItem value="incorrect">Solo incorrectos</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={String(daysBack)} onValueChange={(v) => updateParam('days', v === '7' ? null : v)}>
                    <SelectTrigger className="h-9 w-[130px] text-xs">
                        <CalIcon className="h-3.5 w-3.5 mr-1" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="1">Último día</SelectItem>
                        <SelectItem value="3">Últimos 3 días</SelectItem>
                        <SelectItem value="7">Últimos 7 días</SelectItem>
                        <SelectItem value="14">Últimos 14 días</SelectItem>
                        <SelectItem value="21">Últimos 21 días</SelectItem>
                    </SelectContent>
                </Select>

                <div className="w-[220px]">
                    <SearchableSelect
                        options={employeeOptions}
                        value={employeeFilter || null}
                        onChange={(v) => updateParam('emp', v)}
                        placeholder="Empleado (todos)"
                    />
                </div>
                {employeeFilter && (
                    <Button variant="ghost" size="sm" onClick={() => updateParam('emp', null)}>
                        Limpiar
                    </Button>
                )}
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-24 gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                    <p className="text-sm text-slate-500">Cargando registros...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
                    <ScanSearch className="h-10 w-10 opacity-40" />
                    <p className="text-sm">No hay registros con estos filtros.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map(r => (
                        <ReviewCard
                            key={`${r.kind}-${r.id}`}
                            record={r}
                            employee={r.kind === 'success' ? employeesById.get(r.employee_id!) : undefined}
                            correctEmployee={r.correct_employee_id ? employeesById.get(r.correct_employee_id) : undefined}
                            onCorrect={() => markCorrect(r)}
                            onIncorrect={() => openIncorrectDialog(r)}
                            onClear={() => clearReview(r)}
                            onPreview={() => setPreviewRecord(r)}
                        />
                    ))}
                </div>
            )}

            {/* Preview dialog (big version of the photos) */}
            <Dialog open={!!previewRecord} onOpenChange={(v) => !v && setPreviewRecord(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Detalle del registro</DialogTitle>
                    </DialogHeader>
                    {previewRecord && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Foto de referencia</p>
                                {(() => {
                                    const emp = previewRecord.kind === 'success'
                                        ? employeesById.get(previewRecord.employee_id!)
                                        : previewRecord.correct_employee_id
                                            ? employeesById.get(previewRecord.correct_employee_id)
                                            : undefined;
                                    return emp?.photo_url ? (
                                        <img src={emp.photo_url} className="rounded-lg w-full aspect-square object-cover" alt="ref" />
                                    ) : (
                                        <div className="rounded-lg w-full aspect-square bg-slate-100 flex items-center justify-center text-slate-400">
                                            <UserX className="h-12 w-12" />
                                        </div>
                                    );
                                })()}
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Foto capturada</p>
                                {previewRecord.photo_url ? (
                                    <img src={previewRecord.photo_url} className="rounded-lg w-full aspect-square object-cover" alt="live" />
                                ) : (
                                    <div className="rounded-lg w-full aspect-square bg-slate-100 flex items-center justify-center text-slate-400">
                                        Sin foto
                                    </div>
                                )}
                            </div>
                            <div className="md:col-span-2 text-sm space-y-1">
                                <p><span className="text-slate-500">Fecha:</span> {format(new Date(previewRecord.timestamp), "d MMM yyyy, HH:mm:ss", { locale: es })}</p>
                                {previewRecord.kind === 'success' && (
                                    <p><span className="text-slate-500">Tipo:</span> {previewRecord.type}</p>
                                )}
                                {previewRecord.kind === 'failure' && (
                                    <p><span className="text-slate-500">Razón:</span> {reasonLabel(previewRecord.reason)}</p>
                                )}
                                {previewRecord.similarity !== null && (
                                    <p><span className="text-slate-500">Similitud:</span> {previewRecord.similarity.toFixed(3)}</p>
                                )}
                                {previewRecord.margin !== null && (
                                    <p><span className="text-slate-500">Margen:</span> {previewRecord.margin.toFixed(3)}</p>
                                )}
                                {previewRecord.top_candidates && previewRecord.top_candidates.length > 0 && (
                                    <p className="text-xs text-slate-500 pt-1">
                                        Top candidatos: {previewRecord.top_candidates.map(c => `${c.name}(${c.sim.toFixed(2)})`).join(' · ')}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Evaluation dialog */}
            <Dialog open={evalOpen} onOpenChange={setEvalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FlaskConical className="h-5 w-5" /> Evaluación de parámetros
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-xs text-slate-500">
                            Re-evalúa los embeddings ya guardados con nuevos umbrales.
                            Comparamos con el ground truth que marcaste manualmente y
                            con lo que producción registró para ver qué cambiaría.
                            Actual en prod: <b>threshold=0.5, min_margin=0.08</b>.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="text-xs text-slate-600 block mb-1">Threshold</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="1"
                                    value={evalThreshold}
                                    onChange={(e) => setEvalThreshold(parseFloat(e.target.value) || 0)}
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Mayor = más estricto</p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-600 block mb-1">Min margin</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="1"
                                    value={evalMinMargin}
                                    onChange={(e) => setEvalMinMargin(parseFloat(e.target.value) || 0)}
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Gap top1 vs top2</p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-600 block mb-1">Alcance</label>
                                <Select value={evalScope} onValueChange={(v) => setEvalScope(v as 'labeled' | 'all')}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="labeled">Solo etiquetados</SelectItem>
                                        <SelectItem value="all">Todos con embedding</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-600 block mb-1">Ventana</label>
                                <Select value={String(evalDays)} onValueChange={(v) => setEvalDays(parseInt(v, 10))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="7">7 días</SelectItem>
                                        <SelectItem value="14">14 días</SelectItem>
                                        <SelectItem value="21">21 días</SelectItem>
                                        <SelectItem value="60">60 días</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Button onClick={runEvaluation} disabled={evalRunning} className="w-full gap-2">
                            {evalRunning ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Evaluando...</>
                            ) : (
                                <><Play className="h-4 w-4" /> Correr evaluación</>
                            )}
                        </Button>

                        {evalResult && <EvaluationResults result={evalResult} />}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Incorrect-labeling dialog */}
            <Dialog open={!!labelingRecord} onOpenChange={(v) => { if (!v) { setLabelingRecord(null); setLabelingChoice(null); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>¿Quién era realmente?</DialogTitle>
                    </DialogHeader>
                    {labelingRecord && (
                        <div className="space-y-4">
                            {labelingRecord.photo_url && (
                                <img src={labelingRecord.photo_url} className="rounded-lg w-full max-h-72 object-contain bg-slate-50" alt="live" />
                            )}
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Empleado correcto (dejar vacío si no era nadie del sistema)</p>
                                <SearchableSelect
                                    options={employeeOptions}
                                    value={labelingChoice}
                                    onChange={setLabelingChoice}
                                    placeholder="Seleccionar empleado..."
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => { setLabelingRecord(null); setLabelingChoice(null); }}>
                            Cancelar
                        </Button>
                        <Button onClick={submitIncorrect}>
                            Guardar etiqueta
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ── Card ─────────────────────────────────────────────────────────────
function ReviewCard({
    record, employee, correctEmployee, onCorrect, onIncorrect, onClear, onPreview,
}: {
    record: ReviewRecord;
    employee?: Employee | null;
    correctEmployee?: Employee | null;
    onCorrect: () => void;
    onIncorrect: () => void;
    onClear: () => void;
    onPreview: () => void;
}) {
    const level = riskLevel(record.similarity, record.margin, record.kind);
    const displayedRef = employee ?? correctEmployee ?? null;
    const reviewed = record.review_status !== null;
    const isIncorrect = record.review_status === 'incorrect' || record.review_status === 'should_have_matched';
    const isCorrect = record.review_status === 'correct' || record.review_status === 'confirmed_no_match';

    return (
        <Card className={cn('overflow-hidden', riskBorderClass(level))}>
            <div className="flex gap-2 p-3 bg-slate-50/50 dark:bg-zinc-900/30 border-b">
                {/* Reference photo */}
                <div className="flex-shrink-0 relative">
                    {displayedRef?.photo_url ? (
                        <img src={displayedRef.photo_url} alt="ref" className="h-20 w-20 rounded-md object-cover" />
                    ) : (
                        <div className="h-20 w-20 rounded-md bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-slate-400">
                            <UserX className="h-8 w-8" />
                        </div>
                    )}
                    <span className="absolute -top-1 -left-1 text-[9px] bg-white dark:bg-zinc-950 px-1 rounded border">ref</span>
                </div>
                {/* Live capture */}
                <button
                    onClick={onPreview}
                    className="flex-shrink-0 relative group"
                    title="Ver en grande"
                >
                    {record.photo_url ? (
                        <img src={record.photo_url} alt="live" className="h-20 w-20 rounded-md object-cover group-hover:ring-2 group-hover:ring-blue-500/50" />
                    ) : (
                        <div className="h-20 w-20 rounded-md bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] text-slate-400 text-center px-1">
                            Sin foto
                        </div>
                    )}
                    <span className="absolute -top-1 -left-1 text-[9px] bg-white dark:bg-zinc-950 px-1 rounded border">cámara</span>
                </button>
                {/* Meta */}
                <div className="flex-1 min-w-0 text-sm">
                    <p className="font-medium truncate">
                        {record.kind === 'success'
                            ? (employee ? `${employee.first_name ?? ''} ${employee.last_name ?? ''}`.trim() : `Empleado #${record.employee_id}`)
                            : <span className="text-red-600">{reasonLabel(record.reason)}</span>
                        }
                    </p>
                    <p className="text-xs text-slate-500">
                        {format(new Date(record.timestamp), "d MMM, HH:mm:ss", { locale: es })}
                    </p>
                    {record.kind === 'success' && (
                        <Badge
                            variant="outline"
                            className={cn(
                                'mt-1 text-[10px] px-1.5 py-0',
                                record.type === 'entrada' ? 'border-emerald-400 text-emerald-700' : 'border-orange-400 text-orange-700',
                            )}
                        >
                            {record.type}
                        </Badge>
                    )}
                    <div className="mt-1 flex items-center gap-2 text-xs">
                        {record.similarity !== null && (
                            <span className="text-slate-600">sim <b>{record.similarity.toFixed(3)}</b></span>
                        )}
                        {record.margin !== null && (
                            <span className="text-slate-600">margen <b>{record.margin.toFixed(3)}</b></span>
                        )}
                    </div>
                    <Badge
                        variant="outline"
                        className={cn(
                            'mt-1 text-[10px] px-1.5 py-0',
                            level === 'red' && 'border-red-400 text-red-700',
                            level === 'amber' && 'border-amber-400 text-amber-700',
                            level === 'green' && 'border-emerald-400 text-emerald-700',
                        )}
                    >
                        {riskLabel(level)}
                    </Badge>
                </div>
            </div>

            {/* Top candidates */}
            {record.top_candidates && record.top_candidates.length > 0 && (
                <div className="px-3 py-2 text-[11px] text-slate-500 border-b bg-white/40 dark:bg-zinc-950/30">
                    Top: {record.top_candidates.slice(0, 3).map(c => (
                        <span key={c.id} className="mr-2">
                            {c.name} <b>{c.sim.toFixed(2)}</b>
                        </span>
                    ))}
                </div>
            )}

            {/* Actions */}
            <div className="p-2 flex items-center gap-2">
                {reviewed ? (
                    <>
                        <Badge
                            variant="outline"
                            className={cn(
                                'text-[10px] flex-1 justify-center py-1',
                                isCorrect ? 'border-emerald-400 text-emerald-700' : 'border-red-400 text-red-700',
                            )}
                        >
                            {isCorrect ? '✓ Correcto' : '✗ Incorrecto'}
                            {isIncorrect && correctEmployee && ` → ${correctEmployee.first_name ?? ''}`}
                        </Badge>
                        <Button variant="ghost" size="sm" className="text-xs" onClick={onClear}>
                            Limpiar
                        </Button>
                    </>
                ) : (
                    <>
                        <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs text-emerald-700 hover:bg-emerald-50" onClick={onCorrect}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Correcto
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs text-red-700 hover:bg-red-50" onClick={onIncorrect}>
                            <XCircle className="h-3.5 w-3.5" /> Incorrecto
                        </Button>
                    </>
                )}
            </div>
        </Card>
    );
}

// ── Evaluation results ───────────────────────────────────────────────
function EvaluationResults({ result }: { result: any }) {
    const counts = result?.counts || {};
    const metrics = result?.metrics || {};
    const params = result?.params || {};
    const flippedPositive = result?.flipped_positive || [];
    const flippedNegative = result?.flipped_negative || [];
    const misidentified = result?.misidentified || [];

    return (
        <div className="space-y-4 pt-2 border-t">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard label="Accuracy" value={metrics.accuracy} tone="blue" icon={<Trophy className="h-4 w-4" />} />
                <MetricCard label="Precision" value={metrics.precision} tone="emerald" />
                <MetricCard label="Recall" value={metrics.recall} tone="amber" />
                <MetricCard label="Muestras" value={counts.total} isRaw tone="slate" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-2 rounded bg-emerald-50 text-emerald-800">
                    <p className="text-[10px] uppercase">Aciertos</p>
                    <p className="text-lg font-bold">{counts.matched_correct ?? 0}</p>
                </div>
                <div className="p-2 rounded bg-red-50 text-red-800">
                    <p className="text-[10px] uppercase">Confunde persona</p>
                    <p className="text-lg font-bold">{counts.matched_wrong ?? 0}</p>
                </div>
                <div className="p-2 rounded bg-amber-50 text-amber-800">
                    <p className="text-[10px] uppercase">No reconoce</p>
                    <p className="text-lg font-bold">{counts.false_negatives ?? 0}</p>
                </div>
                <div className="p-2 rounded bg-slate-100 text-slate-800">
                    <p className="text-[10px] uppercase">Rechazo correcto</p>
                    <p className="text-lg font-bold">{counts.true_negatives ?? 0}</p>
                </div>
            </div>

            <p className="text-xs text-slate-500">
                Parámetros: threshold=<b>{params.threshold}</b> min_margin=<b>{params.min_margin}</b>
                {' • '}alcance: {params.scope === 'labeled' ? 'solo etiquetados' : 'todos con embedding'}
                {' • '}ventana: {params.days}d
            </p>

            {flippedPositive.length > 0 && (
                <div>
                    <p className="text-sm font-medium text-red-700 mb-1">
                        ⚠️ Casos que producción acertó y estos parámetros romperían ({flippedPositive.length})
                    </p>
                    <FlipsTable rows={flippedPositive} />
                </div>
            )}

            {flippedNegative.length > 0 && (
                <div>
                    <p className="text-sm font-medium text-emerald-700 mb-1">
                        ✓ Casos que producción falló y estos parámetros arreglarían ({flippedNegative.length})
                    </p>
                    <FlipsTable rows={flippedNegative} />
                </div>
            )}

            {misidentified.length > 0 && (
                <div>
                    <p className="text-sm font-medium text-amber-700 mb-1">
                        Confusiones con estos parámetros ({misidentified.length})
                    </p>
                    <div className="max-h-64 overflow-y-auto border rounded">
                        <table className="w-full text-xs">
                            <thead className="bg-slate-50 sticky top-0">
                                <tr><th className="p-2 text-left">Predicho</th><th className="p-2 text-left">Real</th><th className="p-2 text-right">sim</th><th className="p-2 text-right">margen</th></tr>
                            </thead>
                            <tbody>
                                {misidentified.map((m: any, i: number) => (
                                    <tr key={i} className="border-t">
                                        <td className="p-2 text-red-700">{m.predicted}</td>
                                        <td className="p-2 text-emerald-700">{m.actual}</td>
                                        <td className="p-2 text-right">{m.similarity}</td>
                                        <td className="p-2 text-right">{m.margin}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricCard({ label, value, tone, isRaw, icon }: { label: string; value: number | undefined; tone: string; isRaw?: boolean; icon?: React.ReactNode }) {
    const toneClass = {
        blue: 'bg-blue-50 text-blue-800',
        emerald: 'bg-emerald-50 text-emerald-800',
        amber: 'bg-amber-50 text-amber-800',
        slate: 'bg-slate-100 text-slate-800',
    }[tone] || 'bg-slate-100';
    return (
        <div className={cn('p-3 rounded-lg', toneClass)}>
            <div className="flex items-center gap-1.5 text-xs">
                {icon} <span className="uppercase">{label}</span>
            </div>
            <p className="text-2xl font-bold mt-1">
                {value === undefined || value === null ? '—' : isRaw ? value : `${(value * 100).toFixed(1)}%`}
            </p>
        </div>
    );
}

function FlipsTable({ rows }: { rows: any[] }) {
    return (
        <div className="max-h-56 overflow-y-auto border rounded">
            <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                    <tr>
                        <th className="p-2 text-left">Prod</th>
                        <th className="p-2 text-left">Nuevo</th>
                        <th className="p-2 text-left">Real</th>
                        <th className="p-2 text-right">sim</th>
                        <th className="p-2 text-right">margen</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r: any, i: number) => (
                        <tr key={i} className="border-t">
                            <td className="p-2">{r.prod}</td>
                            <td className="p-2">{r.new}</td>
                            <td className="p-2 font-medium">{r.actual}</td>
                            <td className="p-2 text-right">{r.similarity}</td>
                            <td className="p-2 text-right">{r.margin}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
