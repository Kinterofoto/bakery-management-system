'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface DispatchInventoryConfig {
  id: string;
  allow_dispatch_without_inventory: boolean;
  default_dispatch_location_id: string | null;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

export function useDispatchInventoryConfig() {
  const [config, setConfig] = useState<DispatchInventoryConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch current configuration
  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('dispatch_inventory_config')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .single();

      if (error) throw error;

      setConfig(data);
    } catch (error: any) {
      console.error('Error fetching dispatch config:', error);
      toast.error('Error al cargar configuración de despachos');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Update configuration
  const updateConfig = useCallback(
    async (updates: Partial<Pick<DispatchInventoryConfig, 'allow_dispatch_without_inventory' | 'default_dispatch_location_id'>>) => {
      try {
        const { data: userData } = await supabase.auth.getUser();

        const { data, error } = await supabase
          .from('dispatch_inventory_config')
          .update({
            ...updates,
            updated_by: userData?.user?.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', '00000000-0000-0000-0000-000000000000')
          .select()
          .single();

        if (error) throw error;

        setConfig(data);
        toast.success('Configuración actualizada correctamente');
        return { success: true, data };
      } catch (error: any) {
        console.error('Error updating dispatch config:', error);
        toast.error('Error al actualizar configuración: ' + error.message);
        return { success: false, error };
      }
    },
    [supabase]
  );

  // Toggle allow_dispatch_without_inventory
  const toggleAllowDispatchWithoutInventory = useCallback(async () => {
    if (!config) return;

    return updateConfig({
      allow_dispatch_without_inventory: !config.allow_dispatch_without_inventory,
    });
  }, [config, updateConfig]);

  // Set default dispatch location
  const setDefaultDispatchLocation = useCallback(
    async (locationId: string | null) => {
      return updateConfig({
        default_dispatch_location_id: locationId,
      });
    },
    [updateConfig]
  );

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    config,
    loading,
    fetchConfig,
    updateConfig,
    toggleAllowDispatchWithoutInventory,
    setDefaultDispatchLocation,
  };
}
