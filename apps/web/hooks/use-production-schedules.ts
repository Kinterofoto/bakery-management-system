import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export interface ProductionSchedule {
    id: string
    resource_id: string
    product_id: string
    quantity: number
    start_date: string
    end_date: string
    created_at?: string
    updated_at?: string
}

export function useProductionSchedules() {
    const [schedules, setSchedules] = useState<ProductionSchedule[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Fetch all schedules
    const fetchSchedules = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const { data, error: err } = await supabase
                .from('produccion.production_schedules')
                .select('*')
                .order('start_date', { ascending: true })

            if (err) throw err
            setSchedules(data || [])
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error fetching schedules'
            setError(message)
            toast.error(message)
        } finally {
            setLoading(false)
        }
    }, [supabase])

    // Fetch schedules for specific resource
    const fetchSchedulesByResource = useCallback(async (resourceId: string) => {
        setLoading(true)
        setError(null)
        try {
            const { data, error: err } = await supabase
                .from('produccion.production_schedules')
                .select('*')
                .eq('resource_id', resourceId)
                .order('start_date', { ascending: true })

            if (err) throw err
            setSchedules(data || [])
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error fetching schedules'
            setError(message)
        } finally {
            setLoading(false)
        }
    }, [supabase])

    // Check for overlapping schedules
    const hasOverlap = useCallback(
        (resourceId: string, startDate: Date, endDate: Date, excludeId?: string) => {
            return schedules.some(schedule => {
                if (excludeId && schedule.id === excludeId) return false
                if (schedule.resource_id !== resourceId) return false

                const scheduleStart = new Date(schedule.start_date)
                const scheduleEnd = new Date(schedule.end_date)

                // Check if there's an overlap
                return startDate < scheduleEnd && endDate > scheduleStart
            })
        },
        [schedules]
    )

    // Create new schedule
    const createSchedule = useCallback(
        async (data: Omit<ProductionSchedule, 'id' | 'created_at' | 'updated_at'>) => {
            const startDate = new Date(data.start_date)
            const endDate = new Date(data.end_date)

            // Validate date range
            if (endDate <= startDate) {
                const message = 'La fecha final debe ser posterior a la fecha inicial'
                setError(message)
                toast.error(message)
                return null
            }

            // Check for overlaps
            if (hasOverlap(data.resource_id, startDate, endDate)) {
                const message = 'Esta máquina ya tiene una programación en ese rango de fechas'
                setError(message)
                toast.error(message)
                return null
            }

            try {
                const { data: newSchedule, error: err } = await supabase
                    .from('produccion.production_schedules')
                    .insert([data])
                    .select()
                    .single()

                if (err) throw err
                setSchedules(prev => [...prev, newSchedule].sort((a, b) =>
                    new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
                ))
                toast.success('Programación creada')
                return newSchedule
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Error creating schedule'
                setError(message)
                toast.error(message)
                return null
            }
        },
        [supabase, hasOverlap]
    )

    // Update schedule
    const updateSchedule = useCallback(
        async (
            id: string,
            updates: Partial<Omit<ProductionSchedule, 'id' | 'created_at' | 'updated_at'>>
        ) => {
            const schedule = schedules.find(s => s.id === id)
            if (!schedule) {
                toast.error('Programación no encontrada')
                return null
            }

            const startDate = new Date(updates.start_date || schedule.start_date)
            const endDate = new Date(updates.end_date || schedule.end_date)
            const resourceId = updates.resource_id || schedule.resource_id

            // Validate date range
            if (endDate <= startDate) {
                const message = 'La fecha final debe ser posterior a la fecha inicial'
                setError(message)
                toast.error(message)
                return null
            }

            // Check for overlaps (excluding current schedule)
            if (hasOverlap(resourceId, startDate, endDate, id)) {
                const message = 'Esta máquina ya tiene una programación en ese rango de fechas'
                setError(message)
                toast.error(message)
                return null
            }

            try {
                const { data: updatedSchedule, error: err } = await supabase
                    .from('produccion.production_schedules')
                    .update(updates)
                    .eq('id', id)
                    .select()
                    .single()

                if (err) throw err
                setSchedules(prev =>
                    prev.map(s => (s.id === id ? updatedSchedule : s)).sort((a, b) =>
                        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
                    )
                )
                return updatedSchedule
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Error updating schedule'
                setError(message)
                toast.error(message)
                return null
            }
        },
        [supabase, schedules, hasOverlap]
    )

    // Delete schedule
    const deleteSchedule = useCallback(
        async (id: string) => {
            try {
                const { error: err } = await supabase
                    .from('produccion.production_schedules')
                    .delete()
                    .eq('id', id)

                if (err) throw err
                setSchedules(prev => prev.filter(s => s.id !== id))
                toast.success('Programación eliminada')
                return true
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Error deleting schedule'
                setError(message)
                toast.error(message)
                return false
            }
        },
        [supabase]
    )

    // Load schedules on mount
    useEffect(() => {
        fetchSchedules()
    }, [fetchSchedules])

    return {
        schedules,
        loading,
        error,
        fetchSchedules,
        fetchSchedulesByResource,
        createSchedule,
        updateSchedule,
        deleteSchedule,
        hasOverlap
    }
}
