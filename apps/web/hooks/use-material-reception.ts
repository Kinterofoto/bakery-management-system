"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { compressImage } from "@/lib/image-compression"

type MaterialReception = any
type MaterialReceptionInsert = any
type MaterialReceptionUpdate = any
type ReceptionItem = any
type PurchaseOrder = any
type Product = any

// Item-level quality parameters (specific to each material)
export interface ItemQualityParameters {
  temperature: number // OBLIGATORIO - temperatura del producto
}

// Reception-level quality parameters (general for entire reception)
export interface ReceptionQualityParameters {
  vehicle_temperature?: number | null
  quality_certificate_url?: string | null
  certificate_file?: File | null
  check_dotacion?: boolean
  check_food_handling?: boolean
  check_vehicle_health?: boolean
  check_arl?: boolean
  check_vehicle_clean?: boolean
  check_pest_free?: boolean
  check_toxic_free?: boolean
  check_baskets_clean?: boolean
  check_pallets_good?: boolean
  check_packaging_good?: boolean
}

// Combined type for backward compatibility during transition
export type QualityParameters = ItemQualityParameters & ReceptionQualityParameters

type MaterialReceptionWithDetails = MaterialReception & {
  purchase_order?: PurchaseOrder
  items?: ReceptionItem[]
}

export function useMaterialReception() {
  const { user } = useAuth()
  const [receptions, setReceptions] = useState<MaterialReceptionWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all receptions from NEW SYSTEM (inventory movements)
  const fetchReceptions = async () => {
    try {
      setLoading(true)

      // Fetch movements with reason 'purchase' from new inventory system
      // Note: Fetch without joins due to cross-schema PostgREST limitations
      const { data: movementsData, error: queryError } = await supabase
        .schema('inventario')
        .from('inventory_movements')
        .select('*')
        .eq('reason_type', 'purchase')
        .order('movement_date', { ascending: false })
        .limit(50)

      console.log('📦 Fetch receptions result:', {
        movementsData,
        queryError,
        errorDetails: queryError ? {
          message: queryError.message,
          code: queryError.code,
          details: queryError.details,
          hint: queryError.hint
        } : null
      })

      if (queryError) {
        console.error('❌ Error fetching movements:', queryError)

        // Special handling for schema not exposed error
        if (queryError.code === 'PGRST204' || queryError.message?.includes('schema')) {
          setError('El esquema "inventario" no está configurado en Supabase. Ve a Settings → API → Exposed schemas y agrega "inventario"')
          setReceptions([])
          return
        }

        throw queryError
      }

      if (!movementsData || movementsData.length === 0) {
        console.log('ℹ️ No movements found with reason_type = purchase')
        setReceptions([])
        setError(null)
        return
      }

      // Fetch quality parameters for these movements
      const movementIds = movementsData.map(m => m.id)
      const { data: qualityData, error: qualityError } = await supabase
        .schema('inventario')
        .from('quality_parameters')
        .select('*')
        .in('movement_id', movementIds)

      if (qualityError) {
        console.warn('⚠️ Error fetching quality parameters:', qualityError)
      }

      // Fetch reception-level quality parameters
      const receptionQualityIds = [...new Set((qualityData || []).map(q => q.reception_quality_id).filter(Boolean))]
      console.log('🔍 Reception quality IDs to fetch:', receptionQualityIds)

      const { data: receptionQualityData, error: receptionQualityError } = await supabase
        .schema('inventario')
        .from('reception_quality_parameters')
        .select('*')
        .in('id', receptionQualityIds)

      if (receptionQualityError) {
        console.warn('⚠️ Error fetching reception quality parameters:', receptionQualityError)
      }

      console.log('📸 Reception quality data fetched:', receptionQualityData)

      // Create reception quality lookup map
      const receptionQualityMap = new Map(
        (receptionQualityData || []).map(rq => [rq.id, rq])
      )

      // Create quality lookup map with combined data
      const qualityMap = new Map(
        (qualityData || []).map(q => {
          const receptionQuality = q.reception_quality_id ? receptionQualityMap.get(q.reception_quality_id) : null
          const combined = { ...q, ...receptionQuality }
          console.log('🔗 Combining quality data:', {
            movement_id: q.movement_id,
            item_level: q,
            reception_level: receptionQuality,
            combined: combined,
            certificate_url: combined.quality_certificate_url
          })
          return [q.movement_id, combined]
        })
      )

      console.log('🌡️ Quality parameters fetched:', qualityData?.length || 0)
      console.log('🌡️ Reception quality parameters fetched:', receptionQualityData?.length || 0)

      // Fetch product details separately (cross-schema join)
      const productIds = [...new Set(movementsData.map(m => m.product_id))]
      console.log('🔍 Product IDs to fetch:', productIds)

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, unit')
        .in('id', productIds)

      console.log('📦 Products fetched:', {
        count: productsData?.length,
        products: productsData,
        error: productsError
      })

      if (productsError) {
        console.warn('⚠️ Error fetching products:', productsError)
      }

      // Create product lookup map
      const productsMap = new Map(
        (productsData || []).map(p => [p.id, p])
      )

      console.log('🗺️ Products map size:', productsMap.size)

      // Fetch location details separately
      const locationIds = [...new Set(movementsData.map(m => m.location_id_to).filter(Boolean))]
      const { data: locationsData, error: locationsError } = await supabase
        .schema('inventario')
        .from('locations')
        .select('id, code, name')
        .in('id', locationIds)

      if (locationsError) {
        console.warn('⚠️ Error fetching locations:', locationsError)
      }

      // Create location lookup map
      const locationsMap = new Map(
        (locationsData || []).map(l => [l.id, l])
      )

      // Group movements by reference (if they have one) or by date
      const groupedMovements: Record<string, any> = {}

      for (const movement of movementsData) {
        const key = movement.reference_id || movement.movement_date.split('T')[0] + '-' + movement.id
        const product = productsMap.get(movement.product_id)
        const location = locationsMap.get(movement.location_id_to)

        console.log('🔄 Processing movement:', {
          movement_id: movement.id,
          product_id: movement.product_id,
          product_found: !!product,
          product_name: product?.name,
          movement_number: movement.movement_number
        })

        if (!groupedMovements[key]) {
          groupedMovements[key] = {
            id: movement.reference_id || movement.id,
            reception_number: movement.movement_number,
            reception_date: movement.movement_date.split('T')[0],
            quantity_received: 0,
            items: [],
            purchase_order: movement.reference_type === 'purchase_order' ? { order_number: movement.reference_id } : null,
            location: location
          }
        }

        groupedMovements[key].quantity_received += movement.quantity
        groupedMovements[key].items.push({
          id: movement.id,
          material_id: movement.product_id,
          material_name: product?.name || 'Desconocido',
          quantity_received: movement.quantity,
          unit: product?.unit || movement.unit_of_measure,
          batch_number: movement.batch_number || '',
          expiry_date: movement.expiry_date || '',
          location: location,
          quality_parameters: qualityMap.get(movement.id) || null
        })
      }

      const receptionsArray = Object.values(groupedMovements)
      console.log('✅ Grouped receptions:', receptionsArray.length, receptionsArray)
      setReceptions(receptionsArray as MaterialReceptionWithDetails[])
      setError(null)
    } catch (err) {
      console.error('❌ fetchReceptions error:', err)
      setError(err instanceof Error ? err.message : 'Error fetching receptions')
    } finally {
      setLoading(false)
    }
  }

  // Upload quality certificate photo for reception (not per item)
  const uploadQualityCertificate = async (file: File, receptionId: string): Promise<string> => {
    try {
      // Compress image to max 50KB
      const compressedFile = await compressImage(file, {
        maxSizeKB: 50,
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.85,
        format: 'jpeg'
      })

      // Generate unique filename using reception ID
      const fileName = `${receptionId}/${Date.now()}.jpg`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('certificados_calidad')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg'
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('certificados_calidad')
        .getPublicUrl(fileName)

      console.log('✅ Certificate uploaded:', publicUrlData.publicUrl)
      return publicUrlData.publicUrl
    } catch (err) {
      console.error('Error uploading certificate:', err)
      throw new Error('Error al subir certificado de calidad')
    }
  }

  // Update purchase order status based on reception
  const updatePurchaseOrderStatus = async (orderId: string, receptionItems: Array<any>) => {
    try {
      // Fetch all items from the purchase order
      const { data: orderItems, error: orderItemsError } = await (supabase as any)
        .schema('compras')
        .from('purchase_order_items')
        .select('*')
        .eq('purchase_order_id', orderId)

      if (orderItemsError) {
        console.warn('Error fetching order items:', orderItemsError)
        return
      }

      // Fetch all inventory movements for this purchase order from the NEW system
      const { data: allMovements, error: allMovementsError } = await supabase
        .schema('inventario')
        .from('inventory_movements')
        .select('*')
        .eq('reference_id', orderId)
        .eq('reference_type', 'purchase_order')
        .eq('reason_type', 'purchase')

      if (allMovementsError) {
        console.warn('Error fetching all movements:', allMovementsError)
        return
      }

      // Calculate total received per material
      const receivedByMaterial = new Map<string, number>()
      for (const movement of allMovements || []) {
        const currentTotal = receivedByMaterial.get(movement.product_id) || 0
        receivedByMaterial.set(movement.product_id, currentTotal + (movement.quantity || 0))
      }

      // Check if all items are fully received
      let allReceived = true
      let anyReceived = false

      for (const orderItem of orderItems || []) {
        const totalReceived = receivedByMaterial.get(orderItem.material_id) || 0

        if (totalReceived >= orderItem.quantity_ordered) {
          anyReceived = true
        } else if (totalReceived > 0) {
          anyReceived = true
          allReceived = false
        } else {
          allReceived = false
        }
      }

      // Determine the new status
      let newStatus = 'ordered'
      if (allReceived && anyReceived) {
        newStatus = 'received'
      } else if (anyReceived) {
        newStatus = 'partially_received'
      }

      // Update the purchase order status
      const { error: updateError } = await (supabase as any)
        .schema('compras')
        .from('purchase_orders')
        .update({
          status: newStatus,
          actual_delivery_date: allReceived ? new Date().toISOString().split('T')[0] : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (updateError) {
        console.warn('Error updating purchase order status:', updateError)
      } else {
        console.log(`Purchase order ${orderId} updated to status: ${newStatus}`)
      }
    } catch (err) {
      console.warn('Error updating purchase order status:', err)
      // Don't throw - reception should complete even if status update fails
    }
  }

  // Update tracking status when items are received
  const updateTrackingForReception = async (receptionItems: Array<any>) => {
    try {
      // For each reception item, find related tracking records and update them
      for (const item of receptionItems) {
        // Find tracking records for this material from all dates
        const { data: trackingRecords, error: trackingError } = await (supabase as any)
          .schema('compras')
          .from('explosion_purchase_tracking')
          .select('*')
          .eq('material_id', item.material_id)

        if (trackingError) {
          console.warn('Error fetching tracking records:', trackingError)
          continue
        }

        // Update tracking records to mark as received
        for (const tracking of trackingRecords || []) {
          if (tracking.status === 'ordered' && tracking.quantity_ordered > 0) {
            const { error: updateError } = await (supabase as any)
              .schema('compras')
              .from('explosion_purchase_tracking')
              .update({
                quantity_received: (tracking.quantity_received || 0) + item.quantity_received,
                status: item.quantity_received >= tracking.quantity_ordered ? 'received' : 'partially_received',
                updated_at: new Date().toISOString()
              })
              .eq('id', tracking.id)

            if (updateError) {
              console.warn('Error updating tracking:', updateError)
            } else {
              break // Only update the first matching tracking record
            }
          }
        }
      }
    } catch (err) {
      console.warn('Error updating tracking for reception:', err)
      // Don't throw - reception should complete even if tracking fails
    }
  }

  // Create reception with multiple items (NEW SYSTEM ONLY)
  const createReception = async (data: MaterialReceptionInsert & {
    items?: Array<any>,
    reception_quality?: ReceptionQualityParameters
  }) => {
    try {
      setError(null)

      if (!data.items || data.items.length === 0) {
        throw new Error('No hay materiales para recibir')
      }

      // Validate temperature is present for all items
      for (const item of data.items) {
        if (!item.quality_parameters?.temperature) {
          throw new Error('La temperatura del producto es obligatoria para todos los materiales')
        }
      }

      // =====================================================
      // NEW INVENTORY SYSTEM: Register movements directly
      // =====================================================

      // STEP 1: Create reception-level quality parameters (if provided)
      let receptionQualityId: string | null = null

      if (data.reception_quality) {
        // Generate unique reception ID
        const receptionId = crypto.randomUUID()

        // Upload certificate if provided
        let certificateUrl = data.reception_quality.quality_certificate_url
        if (data.reception_quality.certificate_file) {
          try {
            certificateUrl = await uploadQualityCertificate(
              data.reception_quality.certificate_file,
              receptionId
            )
          } catch (uploadErr) {
            console.error('Error uploading certificate:', uploadErr)
            // Continue without certificate - not critical
          }
        }

        // Insert reception-level quality parameters
        const { data: receptionQualityData, error: receptionQualityError } = await supabase
          .schema('inventario')
          .from('reception_quality_parameters')
          .insert({
            vehicle_temperature: data.reception_quality.vehicle_temperature || null,
            quality_certificate_url: certificateUrl || null,
            check_dotacion: data.reception_quality.check_dotacion ?? true,
            check_food_handling: data.reception_quality.check_food_handling ?? true,
            check_vehicle_health: data.reception_quality.check_vehicle_health ?? true,
            check_arl: data.reception_quality.check_arl ?? true,
            check_vehicle_clean: data.reception_quality.check_vehicle_clean ?? true,
            check_pest_free: data.reception_quality.check_pest_free ?? true,
            check_toxic_free: data.reception_quality.check_toxic_free ?? true,
            check_baskets_clean: data.reception_quality.check_baskets_clean ?? true,
            check_pallets_good: data.reception_quality.check_pallets_good ?? true,
            check_packaging_good: data.reception_quality.check_packaging_good ?? true,
            created_by: user?.id || null
          })
          .select('id')
          .single()

        if (receptionQualityError) {
          console.error('Error saving reception quality parameters:', receptionQualityError)
          throw receptionQualityError
        }

        receptionQualityId = receptionQualityData.id
        console.log('✅ Reception-level quality parameters saved:', receptionQualityId)
      }

      // STEP 2: Create movements and item-level quality parameters
      const movementResults = []

      for (const item of data.items) {
        // 1. Create inventory movement
        const { data: movementData, error: movementError } = await supabase
          .schema('inventario')
          .rpc('perform_inventory_movement', {
            p_product_id: item.material_id,
            p_quantity: item.quantity_received,
            p_movement_type: 'IN',
            p_reason_type: 'purchase',
            p_location_id_from: null,
            p_location_id_to: null, // Will use default location (WH1-RECEIVING)
            p_reference_id: data.purchase_order_id || null,
            p_reference_type: data.purchase_order_id ? 'purchase_order' : 'direct_reception',
            p_notes: item.notes || null,
            p_recorded_by: user?.id || null,
            p_batch_number: item.batch_number || null,
            p_expiry_date: item.expiry_date || null
          })

        if (movementError) {
          console.error('Error creating movement:', movementError)
          throw movementError
        }

        const movementId = movementData.movement_id
        console.log('✅ Movement registered:', movementData.movement_number, 'ID:', movementId)

        // 2. Insert item-level quality parameters (temperature only + link to reception quality)
        const { error: qualityError } = await supabase
          .schema('inventario')
          .from('quality_parameters')
          .insert({
            movement_id: movementId,
            temperature: item.quality_parameters.temperature,
            reception_quality_id: receptionQualityId,
            created_by: user?.id || null
          })

        if (qualityError) {
          console.error('Error saving item quality parameters:', qualityError)
          throw qualityError
        }

        console.log('✅ Item quality parameters saved for movement:', movementId)

        movementResults.push({ ...movementData, movement_id: movementId })
      }

      console.log(`✅ ${movementResults.length} movements with quality parameters registered successfully`)

      // Update purchase order status if this is an order reception
      if (data.purchase_order_id) {
        await updatePurchaseOrderStatus(data.purchase_order_id, data.items)
      }

      await fetchReceptions()

      return {
        success: true,
        movements: movementResults
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error creating reception'
      setError(message)
      console.error('❌ Reception error:', err)
      throw err
    }
  }

  // Update reception header
  const updateReception = async (id: string, data: MaterialReceptionUpdate) => {
    try {
      setError(null)
      const { data: updated, error: updateError } = await (supabase as any)
        .schema('compras')
        .from('material_receptions')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      await fetchReceptions()
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error updating reception'
      setError(message)
      throw err
    }
  }

  // Update reception item
  const updateReceptionItem = async (itemId: string, data: any) => {
    try {
      setError(null)
      const { data: updated, error: updateError } = await (supabase as any)
        .schema('compras')
        .from('reception_items')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .select()
        .single()

      if (updateError) throw updateError

      await fetchReceptions()
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error updating reception item'
      setError(message)
      throw err
    }
  }

  // Delete reception
  const deleteReception = async (id: string) => {
    try {
      setError(null)
      const { error: deleteError } = await (supabase as any)
        .schema('compras')
        .from('material_receptions')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      
      setReceptions(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error deleting reception'
      setError(message)
      throw err
    }
  }

  // Get receptions containing a specific material
  const getReceptionsByMaterial = (materialId: string) => {
    return receptions.filter(r =>
      r.items?.some(item => item.material_id === materialId)
    )
  }

  // Get receptions by purchase order
  const getReceptionsByOrder = (orderId: string) => {
    return receptions.filter(r => r.purchase_order_id === orderId)
  }

  // Get receptions by date range
  const getReceptionsByDateRange = (startDate: string, endDate: string) => {
    return receptions.filter(r => {
      const date = r.reception_date
      return date >= startDate && date <= endDate
    })
  }

  // Get today's receptions
  const getTodayReceptions = () => {
    const today = new Date().toISOString().split('T')[0]
    return receptions.filter(r => r.reception_date === today)
  }

  // Add reception item
  const addReceptionItem = async (receptionId: string, item: any) => {
    try {
      setError(null)
      const { data, error } = await (supabase as any)
        .schema('compras')
        .from('reception_items')
        .insert({
          reception_id: receptionId,
          purchase_order_item_id: item.purchase_order_item_id || null,
          material_id: item.material_id,
          quantity_received: item.quantity_received,
          batch_number: item.batch_number || null,
          expiry_date: item.expiry_date || null,
          notes: item.notes || null
        })
        .select()
        .single()

      if (error) throw error

      await fetchReceptions()
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error adding reception item'
      setError(message)
      throw err
    }
  }

  useEffect(() => {
    fetchReceptions()
  }, [])

  return {
    receptions,
    loading,
    error,
    fetchReceptions,
    createReception,
    updateReception,
    updateReceptionItem,
    deleteReception,
    getReceptionsByMaterial,
    getReceptionsByOrder,
    getReceptionsByDateRange,
    getTodayReceptions,
    addReceptionItem
  }
}
