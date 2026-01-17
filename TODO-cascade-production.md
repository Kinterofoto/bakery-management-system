# TODO: Sistema de Produccion en Cascada

## Fase 1: Backend + Base de Datos

### Base de Datos
- [x] Crear migracion SQL con campos de batch en production_schedules
- [x] Crear funcion `get_next_production_order_number()`
- [x] Crear funcion `get_production_order_schedules()`
- [x] Ejecutar migracion con `supabase db push`

### FastAPI Endpoints
- [x] Crear archivo `apps/api/app/models/production.py` con modelos Pydantic
- [x] Crear archivo `apps/api/app/api/routes/production/cascade.py`
- [x] Implementar `POST /cascade/create` - crear produccion con cascada
- [x] Implementar `POST /cascade/preview` - preview sin crear
- [x] Implementar `GET /cascade/order/{order_number}` - obtener cascada
- [x] Implementar `DELETE /cascade/order/{order_number}` - eliminar cascada
- [x] Registrar router en `apps/api/app/main.py`

### Pruebas
- [x] Levantar servidor FastAPI
- [x] Probar endpoint create con curl
- [x] Verificar schedules creados en base de datos
- [x] Probar endpoint delete

---

## Fase 2: Frontend (Pendiente)
- [ ] Integrar con PlanMaster WeekView
- [ ] Visualizar cascada en UI
- [ ] Permitir crear schedules desde PlanMaster

---

## Decisiones Tecnicas
- **Timing**: Cascada inmediata - cada lote cae al siguiente centro tan pronto termina
- **Lote minimo**: Usar `products.lote_minimo` (mismo para todo el flujo)
- **Paralelo vs Secuencial**: Determinado por `work_centers.capacidad_maxima_carros` y `tipo_capacidad`

## Notas de Progreso
### 2026-01-17
- Completada Fase 1: Backend + Base de Datos
- Endpoints funcionando:
  - POST /api/production/cascade/create - Crea schedules en cascada
  - POST /api/production/cascade/preview - Preview sin crear
  - GET /api/production/cascade/order/{number} - Obtener schedules por orden
  - DELETE /api/production/cascade/order/{number} - Eliminar cascada
- Probado con Croissant Europa: PASTELERIA -> FERMENTACION (paralelo) -> DECORADO
- 9 schedules creados (3 lotes x 3 centros de trabajo)
