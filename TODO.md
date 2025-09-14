# Sistema de Facturación Dual con Remisiones - TODO

## ✅ Completado
- [x] Script SQL para base de datos (35-add-dual-billing-remisions-system.sql)
- [x] Actualizar tipos TypeScript (database.types.ts)
- [x] Hook para manejo de remisiones (use-remisions.ts)
- [x] Generador de PDFs (pdf-generator.ts)
- [x] Modificar hook de exportación múltiple (use-multi-route-export.ts)
- [x] Actualizar modal de confirmación de exportación

## 🔄 En Progreso
- [ ] Ejecutar script SQL en base de datos
- [ ] Agregar toggle de remisión por pedido en dispatch
- [ ] Funcionalidad de facturación posterior con cantidades entregadas (pendiente test)

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