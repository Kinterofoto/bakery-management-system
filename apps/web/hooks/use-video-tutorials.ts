"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import type { VideoTutorial, VideoTutorialInsert, VideoTutorialUpdate } from "@/lib/database.types"

interface UseVideoTutorialOptions {
  modulePath: string
  autoFetch?: boolean
}

export function useVideoTutorial({ modulePath, autoFetch = true }: UseVideoTutorialOptions) {
  const [video, setVideo] = useState<VideoTutorial | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const isSuperAdmin = user?.role === 'super_admin'

  /**
   * Fetch video tutorial for the current module path
   */
  const fetchVideo = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('video_tutorials')
        .select('*')
        .eq('module_path', modulePath)
        .maybeSingle()

      if (error) {
        throw error
      }

      setVideo(data)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching video tutorial'
      setError(errorMessage)
      console.error('Error fetching video tutorial:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [modulePath])

  /**
   * Save or update video tutorial (super_admin only)
   */
  const saveVideo = useCallback(async (videoData: Omit<VideoTutorialInsert, 'created_by' | 'module_path'>) => {
    if (!isSuperAdmin) {
      const error = 'Solo los super administradores pueden configurar tutoriales de video'
      toast.error(error)
      throw new Error(error)
    }

    if (!user) {
      const error = 'Usuario no autenticado'
      toast.error(error)
      throw new Error(error)
    }

    try {
      setLoading(true)
      setError(null)

      // Check if video already exists
      const { data: existingVideo } = await supabase
        .from('video_tutorials')
        .select('id')
        .eq('module_path', modulePath)
        .maybeSingle()

      if (existingVideo) {
        // Update existing video
        const { data, error } = await supabase
          .from('video_tutorials')
          .update(videoData as VideoTutorialUpdate)
          .eq('module_path', modulePath)
          .select()
          .single()

        if (error) throw error

        setVideo(data)
        toast.success('Tutorial de video actualizado exitosamente')
        return data
      } else {
        // Insert new video
        const { data, error } = await supabase
          .from('video_tutorials')
          .insert({
            ...videoData,
            module_path: modulePath,
            created_by: user.id
          })
          .select()
          .single()

        if (error) throw error

        setVideo(data)
        toast.success('Tutorial de video creado exitosamente')
        return data
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al guardar tutorial de video'
      setError(errorMessage)
      toast.error('Error al guardar el tutorial de video')
      console.error('Error saving video tutorial:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [modulePath, isSuperAdmin, user])

  /**
   * Delete video tutorial (super_admin only)
   */
  const deleteVideo = useCallback(async () => {
    if (!isSuperAdmin) {
      const error = 'Solo los super administradores pueden eliminar tutoriales de video'
      toast.error(error)
      throw new Error(error)
    }

    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase
        .from('video_tutorials')
        .delete()
        .eq('module_path', modulePath)

      if (error) throw error

      setVideo(null)
      toast.success('Tutorial de video eliminado exitosamente')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar tutorial de video'
      setError(errorMessage)
      toast.error('Error al eliminar el tutorial de video')
      console.error('Error deleting video tutorial:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [modulePath, isSuperAdmin])

  /**
   * Refresh video data
   */
  const refetch = fetchVideo

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch && modulePath) {
      fetchVideo()
    }
  }, [modulePath, autoFetch, fetchVideo])

  return {
    video,
    loading,
    error,
    isSuperAdmin,
    saveVideo,
    deleteVideo,
    refetch,
    hasVideo: video !== null
  }
}
