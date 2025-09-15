# Sistema de Facturación Dual con Remisiones - TODO

## ✅ Completado
- [x] Script SQL para base de datos (35-add-dual-billing-remisions-system.sql)
- [x] Actualizar tipos TypeScript (database.types.ts)
- [x] Hook para manejo de remisiones (use-remisions.ts)
- [x] Generador de PDFs (pdf-generator.ts)
- [x] Modificar hook de exportación múltiple (use-multi-route-export.ts)
- [x] Actualizar modal de confirmación de exportación

## 🔄 En Progreso (Correcciones Sistema Dual)
- [x] ✅ ARREGLADO: Pedidos No Facturados ahora usa misma lógica que facturación directa
- [x] ✅ ARREGLADO: Historial - archivos Excel corruptos (aplicada misma lógica decodificación que PDFs)
- [ ] Agregar toggle de remisión por pedido en dispatch
- [ ] Configurar algunos clientes de prueba con billing_type = 'remision'

## ✅ Completado (Correcciones)
- [x] Corregir problema de generación de PDF (jsPDF autoTable)
- [x] Implementar almacenamiento de PDF en base de datos
- [x] Corregir descarga de PDFs de remisiones
- [x] Agregar regeneración automática de PDFs faltantes
- [x] Funcionalidad de facturación posterior con cantidades entregadas ✅

## ✅ Completado (Base de datos)
- [x] Ejecutar script SQL en base de datos ✅
- [x] Crear estructura de tablas remisions y remision_items
- [x] Agregar campos billing_type y requires_remision
- [x] Crear funciones SQL para el flujo de remisiones

## ✅ Completado (Nuevas)
- [x] Hook para pedidos no facturados (use-non-invoiced-orders.ts)
- [x] Crear nueva pestaña "Pedidos No Facturados" en dispatch
- [x] Crear nueva pestaña "Despacho de Remisiones" en dispatch
- [x] Componente para gestión de remisiones
- [x] Componente para gestión de pedidos no facturados
- [x] Modal de confirmación para facturación posterior
- [x] Actualizar indicadores visuales por tipo de facturación

## ⏳ Pendiente
- [ ] Pruebas de integración
- [ ] Documentación del sistema
- [ ] Configuración inicial de clientes (facturable vs remision)
- [ ] Agregar filtros por fecha en pestañas de remisiones

## 🎯 Próximo paso
Ejecutar el script SQL para crear la estructura de base de datos necesaria y probar la funcionalidad completa.

## 📝 Notas importantes
- Para remisión: usar `quantity_available` (igual que export actual)
- Para facturación posterior: usar `quantity_delivered` (cantidad real entregada en ruta)
- Mantener etiqueta "Anteriormente Remisionado" en exports posteriores
- Consecutivo automático de remisiones con formato REM-000001