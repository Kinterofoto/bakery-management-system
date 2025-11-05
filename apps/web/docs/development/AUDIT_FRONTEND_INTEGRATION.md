# 🎨 Integración del Sistema de Auditoría en el Frontend

## ✅ Ya Está Configurado

### 1. AuthContext - Inyección Automática de Usuario
**Archivo:** `contexts/AuthContext.tsx`

✅ **COMPLETADO** - El sistema ya está configurado para:
- Inyectar `user_id` automáticamente cuando el usuario inicia sesión
- Actualizar el contexto cuando se refresca el token
- Limpiar el contexto cuando el usuario cierra sesión

**Logs en consola que verás:**
```
✅ Audit context set for user: uuid-123-456
✅ Audit context refreshed for user: uuid-123-456
✅ Audit context cleared on sign out
```

### 2. Hook de Routes - Captura de created_by
**Archivo:** `hooks/use-routes.ts`

✅ **COMPLETADO** - Ahora captura automáticamente:
- `created_by` cuando se crea una ruta
- Usuario del contexto de autenticación

## 🔧 Falta: Integrar en las Páginas de Órdenes

### Opción A: Agregar Tab de Historial en Modal/Drawer de Órdenes

Si tienes un modal o drawer para ver detalles de una orden, agrégale una pestaña de historial:

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OrderAuditHistory } from "@/components/orders/order-audit-history"

function OrderDetailsModal({ order }) {
  return (
    <Dialog>
      <DialogContent className="max-w-4xl">
        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Detalles</TabsTrigger>
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger> {/* ← NUEVO */}
          </TabsList>

          <TabsContent value="details">
            {/* Tu contenido actual de detalles */}
          </TabsContent>

          <TabsContent value="items">
            {/* Tu contenido actual de items */}
          </TabsContent>

          <TabsContent value="history">
            <OrderAuditHistory orderId={order.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
```

### Opción B: Agregar Sección de Historial en Página de Detalles

Si tienes una página completa para ver una orden:

```tsx
import { OrderAuditHistory } from "@/components/orders/order-audit-history"

export default function OrderDetailsPage({ params }: { params: { id: string } }) {
  return (
    <div className="container py-8">
      <div className="grid gap-6">
        {/* Sección de detalles */}
        <Card>
          <CardHeader>
            <CardTitle>Detalles de la Orden</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Tu contenido actual */}
          </CardContent>
        </Card>

        {/* Sección de items */}
        <Card>
          <CardHeader>
            <CardTitle>Items del Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Tu contenido actual */}
          </CardContent>
        </Card>

        {/* ← NUEVA SECCIÓN: Historial de Cambios */}
        <OrderAuditHistory orderId={params.id} />
      </div>
    </div>
  )
}
```

### Opción C: Botón para Abrir Modal de Historial

Si prefieres un enfoque más minimalista:

```tsx
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { OrderAuditHistory } from "@/components/orders/order-audit-history"
import { History } from "lucide-react"

function OrderCard({ order }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Orden #{order.order_number}</CardTitle>

        {/* ← NUEVO: Botón de historial */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <History className="h-4 w-4 mr-2" />
              Ver Historial
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Historial de Cambios - Orden #{order.order_number}</DialogTitle>
            </DialogHeader>
            <OrderAuditHistory orderId={order.id} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {/* Tu contenido actual */}
      </CardContent>
    </Card>
  )
}
```

## 🎯 Archivos Donde Probablemente Necesitas Integrar

Basado en tu estructura de carpetas, estos son los archivos candidatos:

### 1. Página Principal de Órdenes
**Archivo:** `app/order-management/orders/page.tsx`
- Agregar botón "Ver Historial" en cada fila de la tabla
- O agregar modal de detalles con tab de historial

### 2. Dashboard de Órdenes
**Archivo:** `app/order-management/orders/dashboard/page.tsx`
- Si tienes cards o modales de órdenes, agregar historial ahí

### 3. Revisión Área 1 y 2
**Archivos:**
- `app/order-management/review-area1/page.tsx`
- `app/order-management/review-area2/page.tsx`
- **MUY IMPORTANTE**: Los revisores necesitan ver quién cambió qué

### 4. Dispatch
**Archivo:** `app/order-management/dispatch/page.tsx`
- Ver historial de asignación a rutas
- Ver quién despachó cada pedido

## 📦 Componentes que Ya Tienes Listos

### `<OrderAuditHistory>`
**Import:** `@/components/orders/order-audit-history`

**Props:**
```tsx
interface OrderAuditHistoryProps {
  orderId: string        // Required: UUID de la orden
  className?: string     // Optional: clases CSS adicionales
}
```

**Ejemplo de uso:**
```tsx
<OrderAuditHistory orderId="uuid-123-456" />
```

**Features automáticas:**
- ✅ Timeline visual de cambios
- ✅ Muestra quién hizo cada cambio
- ✅ Diff de valores anteriores vs nuevos
- ✅ Color-coded por importancia (crítico/importante/normal)
- ✅ Timestamps relativos ("hace 2 horas")
- ✅ Loading state automático
- ✅ Error handling incluido
- ✅ Scroll infinito para historial largo
- ✅ Metadata técnica expandible (IP, user agent)

### `useOrderAudit()` Hook
**Import:** `@/hooks/use-order-audit`

**Uso directo (si quieres personalizar el UI):**
```tsx
import { useOrderAudit, parseOrderChanges } from "@/hooks/use-order-audit"

function MyCustomHistoryComponent({ orderId }) {
  const { logs, loading, error } = useOrderAudit(orderId)

  if (loading) return <div>Cargando...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      {logs.map(log => {
        const changes = parseOrderChanges(log)
        return (
          <div key={log.id}>
            <p>{log.changed_by_name} modificó:</p>
            {changes.map(change => (
              <div key={change.field}>
                {change.label}: {change.oldValue} → {change.newValue}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
```

## 🚀 Siguiente Paso Inmediato

**RECOMENDACIÓN:** Empieza por agregar el botón de historial en la página principal de órdenes.

1. Abre: `app/order-management/orders/page.tsx`
2. Busca donde se muestran las órdenes (tabla o cards)
3. Agrega un botón "Ver Historial" usando la **Opción C** de arriba
4. Prueba con una orden existente

## 🧪 Cómo Probar

1. **Ejecuta las migraciones SQL** primero (si no lo has hecho):
   ```sql
   -- En Supabase Dashboard → SQL Editor
   scripts/40-add-audit-columns-to-routes.sql
   scripts/41-create-orders-audit-system.sql
   scripts/42-create-session-config-helper.sql
   ```

2. **Reinicia tu app** para cargar el nuevo código del AuthContext

3. **Inicia sesión** y verifica en consola:
   ```
   ✅ Audit context set for user: uuid-123
   ```

4. **Modifica una orden** (cambiar estado, asignar ruta, etc.)

5. **Abre el historial** de esa orden → Deberías ver el cambio

## 📊 Ejemplo Visual de Cómo Se Verá

```
┌─────────────────────────────────────────────────────┐
│  Historial de Cambios                               │
│  3 cambios registrados                              │
├─────────────────────────────────────────────────────┤
│                                                      │
│  👤 Juan Pérez                            UPDATE    │
│     🕒 hace 2 horas • 15 Ene 2025 10:30            │
│                                                      │
│     ┌──────────────────────────────────────┐       │
│     │ Estado                      [CRÍTICO] │       │
│     │ review_area1 → ready_dispatch        │       │
│     └──────────────────────────────────────┘       │
│                                                      │
│     ┌──────────────────────────────────────┐       │
│     │ Ruta asignada              [CRÍTICO] │       │
│     │ Sin asignar → Asignada               │       │
│     └──────────────────────────────────────┘       │
│                                                      │
│  ──────────────────────────────────────────────    │
│                                                      │
│  👤 María López                           UPDATE    │
│     🕒 ayer • 14 Ene 2025 14:20                    │
│                                                      │
│     ┌──────────────────────────────────────┐       │
│     │ Observaciones              [NORMAL]  │       │
│     │ "Entregar antes..." → "Urgente..."   │       │
│     └──────────────────────────────────────┘       │
│                                                      │
│  ──────────────────────────────────────────────    │
│                                                      │
│  👤 Carlos Ruiz                           INSERT    │
│     🕒 hace 3 días • 12 Ene 2025 09:15            │
│                                                      │
│     ┌──────────────────────────────────────┐       │
│     │ Orden                      [DEFAULT]  │       │
│     │ Creada                                │       │
│     └──────────────────────────────────────┘       │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## ❓ ¿Necesitas Ayuda?

Si no encuentras dónde agregar el componente, dime:
1. ¿Cómo se ven actualmente tus órdenes? (tabla, cards, lista)
2. ¿Tienes modal/drawer para ver detalles?
3. ¿En qué página específica quieres el historial?

Y te puedo ayudar a integrarlo exactamente donde lo necesitas.
