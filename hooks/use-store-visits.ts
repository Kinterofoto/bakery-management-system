"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"

export interface StoreVisit {
  id: string
  client_id: string
  branch_id?: string
  branch_name_custom?: string
  visit_date: string
  operator_name?: string
  operator_phone?: string
  general_comments?: string
  average_score?: number
  created_by?: string
  created_at: string
  updated_at: string
  client?: {
    id: string
    name: string
  }
  branch?: {
    id: string
    name: string
  }
}

export interface ProductEvaluation {
  id: string
  visit_id: string
  product_id: string
  has_stock: boolean
  score_baking?: number
  score_display?: number
  score_presentation?: number
  score_taste?: number
  storage_temperature?: number
  score_staff_training?: number
  score_baking_params?: number
  comments?: string
  created_at: string
  updated_at: string
  product?: {
    id: string
    name: string
    weight?: number
  }
}

export interface VisitPhoto {
  id: string
  visit_id: string
  product_evaluation_id?: string
  photo_url: string
  photo_type: 'product' | 'general'
  created_at: string
}

export interface CreateVisitData {
  client_id: string
  branch_id?: string
  branch_name_custom?: string
  visit_date: string
  operator_name?: string
  operator_phone?: string
  general_comments?: string
  evaluations: Array<{
    product_id: string
    has_stock: boolean
    score_baking?: number
    score_display?: number
    score_presentation?: number
    score_taste?: number
    storage_temperature?: number
    score_staff_training?: number
    score_baking_params?: number
    comments?: string
    photos?: File[]
  }>
  general_photos?: File[]
}

export function useStoreVisits() {
  const [visits, setVisits] = useState<StoreVisit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const fetchVisits = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch visits
      const { data: visitsData, error: visitsError } = await supabase
        .schema("visitas")
        .from("store_visits")
        .select("*")
        .order("visit_date", { ascending: false })

      if (visitsError) throw visitsError

      // Manually fetch related data
      const visitsWithRelations = await Promise.all(
        (visitsData || []).map(async (visit) => {
          const { data: client } = await supabase
            .from("clients")
            .select("id, name")
            .eq("id", visit.client_id)
            .single()

          let branch = null
          if (visit.branch_id) {
            const { data: branchData } = await supabase
              .from("branches")
              .select("id, name")
              .eq("id", visit.branch_id)
              .single()
            branch = branchData
          }

          return {
            ...visit,
            client,
            branch
          }
        })
      )

      setVisits(visitsWithRelations)
    } catch (err: any) {
      console.error("Error fetching visits:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getVisitsByClient = async (clientId: string) => {
    try {
      const { data: visitsData, error } = await supabase
        .schema("visitas")
        .from("store_visits")
        .select("*")
        .eq("client_id", clientId)
        .order("visit_date", { ascending: false })

      if (error) throw error

      // Manually fetch related data
      const visitsWithRelations = await Promise.all(
        (visitsData || []).map(async (visit) => {
          const { data: client } = await supabase
            .from("clients")
            .select("id, name")
            .eq("id", visit.client_id)
            .single()

          let branch = null
          if (visit.branch_id) {
            const { data: branchData } = await supabase
              .from("branches")
              .select("id, name")
              .eq("id", visit.branch_id)
              .single()
            branch = branchData
          }

          return {
            ...visit,
            client,
            branch
          }
        })
      )

      return visitsWithRelations
    } catch (err: any) {
      console.error("Error fetching visits by client:", err)
      throw err
    }
  }

  const getVisitsByBranch = async (branchId: string) => {
    try {
      const { data: visitsData, error } = await supabase
        .schema("visitas")
        .from("store_visits")
        .select("*")
        .eq("branch_id", branchId)
        .order("visit_date", { ascending: false })

      if (error) throw error

      // Manually fetch related data
      const visitsWithRelations = await Promise.all(
        (visitsData || []).map(async (visit) => {
          const { data: client } = await supabase
            .from("clients")
            .select("id, name")
            .eq("id", visit.client_id)
            .single()

          let branch = null
          if (visit.branch_id) {
            const { data: branchData } = await supabase
              .from("branches")
              .select("id, name")
              .eq("id", visit.branch_id)
              .single()
            branch = branchData
          }

          return {
            ...visit,
            client,
            branch
          }
        })
      )

      return visitsWithRelations
    } catch (err: any) {
      console.error("Error fetching visits by branch:", err)
      throw err
    }
  }

  const getVisitDetails = async (visitId: string) => {
    try {
      const { data: visitData, error: visitError } = await supabase
        .schema("visitas")
        .from("store_visits")
        .select("*")
        .eq("id", visitId)
        .single()

      if (visitError) throw visitError

      // Fetch client
      const { data: client } = await supabase
        .from("clients")
        .select("id, name")
        .eq("id", visitData.client_id)
        .single()

      // Fetch branch if exists
      let branch = null
      if (visitData.branch_id) {
        const { data: branchData } = await supabase
          .from("branches")
          .select("id, name")
          .eq("id", visitData.branch_id)
          .single()
        branch = branchData
      }

      const visit = {
        ...visitData,
        client,
        branch
      }

      // Fetch evaluations
      const { data: evaluationsData, error: evalError } = await supabase
        .schema("visitas")
        .from("product_evaluations")
        .select("*")
        .eq("visit_id", visitId)

      if (evalError) throw evalError

      // Fetch products for evaluations
      const evaluations = await Promise.all(
        (evaluationsData || []).map(async (evaluation) => {
          const { data: product } = await supabase
            .from("products")
            .select("id, name, weight")
            .eq("id", evaluation.product_id)
            .single()

          return {
            ...evaluation,
            product
          }
        })
      )

      // Fetch photos
      const { data: photos, error: photosError } = await supabase
        .schema("visitas")
        .from("visit_photos")
        .select("*")
        .eq("visit_id", visitId)

      if (photosError) throw photosError

      return {
        visit,
        evaluations,
        photos: photos || []
      }
    } catch (err: any) {
      console.error("Error fetching visit details:", err)
      throw err
    }
  }

  // Get products that have been sold to a specific client/branch
  const getProductsSoldToClientBranch = async (clientId: string, branchId?: string) => {
    try {
      let query = supabase
        .from("order_items")
        .select(`
          product_id,
          product:products(id, name, weight)
        `)
        .not("product_id", "is", null)

      // Join with orders to filter by client
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id")
        .eq("client_id", clientId)
        .eq("branch_id", branchId || "")

      if (ordersError) throw ordersError

      if (!orders || orders.length === 0) {
        return []
      }

      const orderIds = orders.map(o => o.id)

      const { data, error } = await query.in("order_id", orderIds)

      if (error) throw error

      // Get unique products
      const uniqueProducts = Array.from(
        new Map(
          data?.map(item => [item.product_id, item.product])
        ).values()
      )

      return uniqueProducts.filter(p => p !== null)
    } catch (err: any) {
      console.error("Error fetching products sold to client:", err)
      throw err
    }
  }

  const uploadPhoto = async (file: File, visitId: string, productEvaluationId?: string): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${visitId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('visit-photos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('visit-photos')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (err: any) {
      console.error("Error uploading photo:", err)
      throw err
    }
  }

  const createVisit = async (visitData: CreateVisitData) => {
    try {
      if (!user) {
        throw new Error("User not authenticated")
      }

      // 1. Create visit
      const { data: visit, error: visitError } = await supabase
        .schema("visitas")
        .from("store_visits")
        .insert({
          client_id: visitData.client_id,
          branch_id: visitData.branch_id,
          branch_name_custom: visitData.branch_name_custom,
          visit_date: visitData.visit_date,
          operator_name: visitData.operator_name,
          operator_phone: visitData.operator_phone,
          general_comments: visitData.general_comments,
          created_by: user.id
        })
        .select()
        .single()

      if (visitError) throw visitError

      // 2. Create product evaluations
      for (const evaluation of visitData.evaluations) {
        const { data: evalData, error: evalError } = await supabase
          .schema("visitas")
          .from("product_evaluations")
          .insert({
            visit_id: visit.id,
            product_id: evaluation.product_id,
            has_stock: evaluation.has_stock,
            score_baking: evaluation.score_baking,
            score_display: evaluation.score_display,
            score_presentation: evaluation.score_presentation,
            score_taste: evaluation.score_taste,
            storage_temperature: evaluation.storage_temperature,
            score_staff_training: evaluation.score_staff_training,
            score_baking_params: evaluation.score_baking_params,
            comments: evaluation.comments
          })
          .select()
          .single()

        if (evalError) throw evalError

        // Upload product photos
        if (evaluation.photos && evaluation.photos.length > 0) {
          for (const photo of evaluation.photos) {
            const photoUrl = await uploadPhoto(photo, visit.id, evalData.id)

            const { error: photoError } = await supabase
              .schema("visitas")
              .from("visit_photos")
              .insert({
                visit_id: visit.id,
                product_evaluation_id: evalData.id,
                photo_url: photoUrl,
                photo_type: 'product'
              })

            if (photoError) throw photoError
          }
        }
      }

      // 3. Upload general photos
      if (visitData.general_photos && visitData.general_photos.length > 0) {
        for (const photo of visitData.general_photos) {
          const photoUrl = await uploadPhoto(photo, visit.id)

          const { error: photoError } = await supabase
            .schema("visitas")
            .from("visit_photos")
            .insert({
              visit_id: visit.id,
              photo_url: photoUrl,
              photo_type: 'general'
            })

          if (photoError) throw photoError
        }
      }

      await fetchVisits()
      return visit
    } catch (err: any) {
      console.error("Error creating visit:", err)
      throw err
    }
  }

  useEffect(() => {
    fetchVisits()
  }, [])

  return {
    visits,
    loading,
    error,
    createVisit,
    getVisitsByClient,
    getVisitsByBranch,
    getVisitDetails,
    getProductsSoldToClientBranch,
    uploadPhoto,
    refetch: fetchVisits
  }
}
