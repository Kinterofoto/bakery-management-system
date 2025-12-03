'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PackageCheck, AlertCircle, Info, Loader2 } from 'lucide-react';
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
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow-negative" className="text-base">
                Permitir balances negativos
              </Label>
              <p className="text-sm text-gray-500">
                Cuando está activado, el sistema permitirá realizar despachos incluso si no hay
                existencias suficientes, generando balances negativos en el inventario.
              </p>
            </div>
            <Switch
              id="allow-negative"
              checked={config.allow_dispatch_without_inventory}
              onCheckedChange={handleToggleAllowNegative}
              disabled={saving}
            />
          </div>

          {config.allow_dispatch_without_inventory && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Advertencia:</strong> Con esta opción activada, el inventario puede quedar
                en negativo. Asegúrate de revisar regularmente los productos con balance negativo y
                ajustar el inventario correspondiente.
              </AlertDescription>
            </Alert>
          )}

          {!config.allow_dispatch_without_inventory && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Los despachos serán bloqueados si no hay suficiente inventario disponible. Esto
                ayuda a mantener un control estricto del inventario.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-blue-900">
            <Info className="h-4 w-4" />
            Cómo funciona
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p>
            Cuando se crea un despacho desde el módulo de Despachos, el sistema automáticamente:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              Registra un movimiento de inventario de tipo <strong>SALIDA (OUT)</strong> por cada
              producto despachado desde <strong>WH3 (Producto Terminado)</strong>
            </li>
            <li>
              Actualiza el balance de inventario en WH3, restando las cantidades despachadas
            </li>
            <li>
              Vincula el movimiento con el pedido correspondiente para trazabilidad completa
            </li>
            <li>
              Si "Despachar sin Existencias" está activado, permite crear el despacho aunque el
              balance quede negativo
            </li>
          </ul>
          <p className="mt-3 font-medium">
            Todos los movimientos quedan registrados en el Kardex para auditoría y seguimiento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
