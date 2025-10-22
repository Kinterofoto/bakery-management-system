# Sistema de Auditoría - Guía de Implementación

## 📋 Descripción General

Sistema completo de auditoría que registra **todos** los cambios en las órdenes y quién crea/modifica las rutas.

### Características
- ✅ Captura automática de TODOS los cambios en orders (INSERT, UPDATE, DELETE)
- ✅ Historial completo con valores anteriores y nuevos en formato JSONB
- ✅ Tracking de quién creó cada ruta
- ✅ Metadata adicional (IP, user agent)
- ✅ UI visual para ver historial de cambios

## 🚀 Pasos de Instalación

### 1. Ejecutar Migraciones SQL

Ejecuta los siguientes scripts en orden en tu base de datos Supabase:

```bash
# 1. Agregar columnas de auditoría a routes
scripts/40-add-audit-columns-to-routes.sql

# 2. Crear sistema de auditoría para orders
scripts/41-create-orders-audit-system.sql

# 3. Crear función helper para contexto de sesión
scripts/42-create-session-config-helper.sql
```

**Desde Supabase Dashboard:**
1. Ve a SQL Editor
2. Copia y pega el contenido de cada archivo
3. Ejecuta uno por uno

### 2. Verificar Tablas Creadas

Después de ejecutar los scripts, verifica que existan estas tablas:

```sql
-- Verificar tabla de auditoría
SELECT * FROM orders_audit LIMIT 1;

-- Verificar vista con usuarios
SELECT * FROM orders_audit_with_user LIMIT 1;

-- Verificar columnas en routes
SELECT created_by, updated_by FROM routes LIMIT 1;
```

### 3. Probar el Sistema

#### Crear una Orden (debe generar log INSERT)
```sql
-- El trigger capturará automáticamente la creación
INSERT INTO orders (order_number, client_id, expected_delivery_date, created_by, status)
VALUES ('TEST001', 'some-client-uuid', '2025-01-20', 'some-user-uuid', 'received');

-- Ver el log
SELECT * FROM orders_audit WHERE order_id = (SELECT id FROM orders WHERE order_number = 'TEST001');
```

#### Actualizar una Orden (debe generar log UPDATE)
```sql
UPDATE orders
SET status = 'review_area1'
WHERE order_number = 'TEST001';

-- Ver los logs (debe mostrar old_data y new_data)
SELECT
  action,
  old_data->>'status' as old_status,
  new_data->>'status' as new_status,
  changed_at
FROM orders_audit
WHERE order_id = (SELECT id FROM orders WHERE order_number = 'TEST001')
ORDER BY changed_at DESC;
```

## 🎨 Uso en el Frontend

### 1. Mostrar Historial en Modal de Orden

```tsx
import { OrderAuditHistory } from "@/components/orders/order-audit-history"

function OrderDetailsModal({ orderId }) {
  return (
    <Tabs>
      <Tab>Detalles</Tab>
      <Tab>Items</Tab>
      <Tab>Historial</Tab> {/* ← Nueva pestaña */}
    </Tabs>

    <TabContent value="historial">
      <OrderAuditHistory orderId={orderId} />
    </TabContent>
  )
}
```

### 2. Hook para Consultar Historial

```tsx
import { useOrderAudit } from "@/hooks/use-order-audit"

function MyComponent({ orderId }) {
  const { logs, loading, error } = useOrderAudit(orderId)

  if (loading) return <div>Cargando...</div>

  return (
    <div>
      {logs.map(log => (
        <div key={log.id}>
          {log.changed_by_name} - {log.action} - {formatDate(log.changed_at)}
        </div>
      ))}
    </div>
  )
}
```

### 3. Ver Cambios Específicos

```tsx
import { parseOrderChanges } from "@/hooks/use-order-audit"

function ShowChanges({ log }) {
  const changes = parseOrderChanges(log)

  return (
    <div>
      {changes.map(change => (
        <div key={change.field}>
          <strong>{change.label}:</strong>
          {change.oldValue} → {change.newValue}
        </div>
      ))}
    </div>
  )
}
```

## 📊 Queries Útiles

### Ver todos los cambios de estado de una orden
```sql
SELECT
  changed_at,
  changed_by_name,
  old_data->>'status' as estado_anterior,
  new_data->>'status' as estado_nuevo
FROM orders_audit_with_user
WHERE order_id = 'ORDER-UUID-HERE'
  AND old_data->>'status' IS DISTINCT FROM new_data->>'status'
ORDER BY changed_at DESC;
```

### Ver cuándo se asignó una orden a una ruta
```sql
SELECT
  changed_at,
  changed_by_name,
  new_data->>'assigned_route_id' as ruta_asignada
FROM orders_audit_with_user
WHERE order_id = 'ORDER-UUID-HERE'
  AND old_data->>'assigned_route_id' IS NULL
  AND new_data->>'assigned_route_id' IS NOT NULL;
```

### Ver quién creó cada ruta
```sql
SELECT
  r.route_name,
  r.route_date,
  r.created_at,
  u.name as creado_por
FROM routes r
LEFT JOIN users u ON r.created_by = u.id
ORDER BY r.created_at DESC;
```

### Estadísticas de cambios por usuario
```sql
SELECT
  changed_by_name,
  COUNT(*) as total_cambios,
  COUNT(*) FILTER (WHERE action = 'INSERT') as ordenes_creadas,
  COUNT(*) FILTER (WHERE action = 'UPDATE') as ordenes_modificadas
FROM orders_audit_with_user
WHERE changed_at >= NOW() - INTERVAL '30 days'
GROUP BY changed_by_name
ORDER BY total_cambios DESC;
```

## 🔍 Debugging

### Ver estructura de un log
```sql
SELECT
  id,
  action,
  jsonb_pretty(old_data) as datos_anteriores,
  jsonb_pretty(new_data) as datos_nuevos,
  changed_by_name,
  changed_at
FROM orders_audit_with_user
WHERE order_id = 'ORDER-UUID-HERE'
ORDER BY changed_at DESC
LIMIT 1;
```

### Ver qué campos cambiaron
```sql
SELECT
  key as campo,
  old_data->key as valor_anterior,
  new_data->key as valor_nuevo
FROM orders_audit,
  jsonb_object_keys(new_data) key
WHERE order_id = 'ORDER-UUID-HERE'
  AND old_data->key IS DISTINCT FROM new_data->key
  AND action = 'UPDATE'
ORDER BY changed_at DESC;
```

## 🛠️ Troubleshooting

### El trigger no captura cambios
1. Verificar que el trigger existe:
```sql
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'orders_audit_trigger';
```

2. Verificar permisos:
```sql
SELECT has_table_privilege('orders_audit', 'INSERT');
```

### No aparece el nombre del usuario
1. Verificar que el usuario existe en la tabla users:
```sql
SELECT id, name FROM users WHERE id = 'USER-UUID-HERE';
```

2. Verificar la vista:
```sql
SELECT * FROM orders_audit_with_user WHERE changed_by IS NOT NULL LIMIT 1;
```

### Frontend no muestra historial
1. Verificar que el componente está importado correctamente
2. Abrir consola del navegador para ver errores
3. Verificar que orderId no sea null

## 📝 Notas Adicionales

- **Performance**: Los índices GIN en JSONB permiten búsquedas rápidas por campo específico
- **Almacenamiento**: Cada cambio guarda el registro completo, considera limpieza periódica de logs antiguos
- **Privacidad**: Solo usuarios autenticados pueden ver los logs
- **Extensibilidad**: Para auditar otras tablas, duplica el patrón de `orders_audit`

## 🔄 Próximos Pasos (Opcional)

1. Agregar auditoría para otras tablas críticas (clients, products, price_lists)
2. Crear dashboard de auditoría para administradores
3. Implementar alertas para cambios críticos
4. Agregar exportación de logs para compliance

## 📞 Soporte

Si encuentras problemas, verifica:
1. Logs de Supabase (Dashboard → Logs)
2. Consola del navegador (errores de frontend)
3. Permisos RLS (Row Level Security)
