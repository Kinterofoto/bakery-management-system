'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PackageCheck, AlertCircle, Loader2 } from 'lucide-react';
import { useDispatchInventoryConfig } from '@/hooks/use-dispatch-inventory-config';

export function DispatchInventorySection() {
  const { config, loading, updateConfig } = useDispatchInventoryConfig();
  const [saving, setSaving] = useState(false);

  const handleToggleAllowNegative = async () => {
    if (!config) return;

    setSaving(true);
    const result = await updateConfig({
      allow_dispatch_without_inventory: !config.allow_dispatch_without_inventory,
    });
    setSaving(false);

    if (!result?.success) {
      // Reset the switch if update failed
      return;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!config) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No se pudo cargar la configuración. Por favor, recarga la página.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <PackageCheck className="h-5 w-5 text-blue-600" />
          Configuración de Despachos e Inventario
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Configura cómo los despachos afectan el inventario del sistema
        </p>
      </div>

      {/* Allow Dispatch Without Inventory */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Despachar sin Existencias</CardTitle>
          <CardDescription>
            Permite crear despachos aunque no haya suficiente inventario disponible
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow-negative" className="text-base">
                Permitir balances negativos
              </Label>
            </div>
            <Switch
              id="allow-negative"
              checked={config.allow_dispatch_without_inventory}
              onCheckedChange={handleToggleAllowNegative}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
