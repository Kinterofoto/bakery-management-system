# TODO: Sistema de Produccion en Cascada

> **Documentacion Completa**: Ver [apps/api/docs/CASCADE-PRODUCTION.md](apps/api/docs/CASCADE-PRODUCTION.md) para documentacion tecnica detallada del sistema.

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
- [x] **TEST CONFLICTOS**: Dos producciones simultaneas con centros compartidos

---

## Fase 2: Frontend
- [x] Crear hook `use-cascade-production.ts` para API
- [x] Crear `CascadePreviewModal.tsx` para preview de cascada
- [x] Agregar boton "Crear en Cascada" en AddProductionModal
- [x] Integrar en WeeklyPlanGrid
- [x] Probar flujo completo en navegador

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
- Frontend integrado con modal de preview de cascada

#### Test de Conflictos en Centros Compartidos
Dos producciones programadas a las 08:00 con centros compartidos (FERMENTACION, DECORADO):

| Producto | Ruta | Lote min | Lotes |
|----------|------|----------|-------|
| Croissant Europa | PASTELERIA → FERMENTACION → DECORADO | 300 | 3 |
| Croissant Multicereal | CROISSOMAT → FERMENTACION → DECORADO | 400 | 2 |

**Resultado en FERMENTACION (paralelo):**
```
C.Europa B1: 10:40 - 16:00  ← Entran en paralelo
C.Multicereal B1: 12:00 - 20:00  ← Se procesan simultaneamente
C.Europa B2: 13:20 - 18:40
C.Europa B3: 16:00 - 21:20
C.Multicereal B2: 16:00 - 00:00
```

**Resultado en DECORADO (secuencial):**
```
C.Europa B1: 16:00 - 19:20  ← Cola FIFO
C.Europa B2: 19:20 - 22:40
C.Europa B3: 22:40 - 02:00
C.Multicereal B1: 02:00 - 04:00  ← Espera su turno
C.Multicereal B2: 04:00 - 06:00
```

**Conclusiones:**
- Centros PARALELOS: Multiples lotes se procesan simultaneamente
- Centros SECUENCIALES: Lotes hacen cola (FIFO) sin solapamiento
- El sistema consulta schedules existentes antes de programar nuevos

### 2026-01-18
- Removido filtro de "solo Armado" en PlanMaster - ahora muestra todos los centros de trabajo activos
- Sistema de cascada completamente funcional y listo para uso

### 2026-01-19
- **Auto-cascade en drag & drop**: Al hacer drag, automáticamente intenta crear cascada si el producto tiene ruta definida
- **Fix: work_center_id ignorado**: La cascada ahora siempre usa la ruta de `production_routes`, sin importar desde qué centro se hace drag
- **Fix: timezone naive**: Resuelto error de comparación entre datetimes con y sin timezone
- **Fix: respeta fecha del usuario**: La cascada ya no encola automáticamente después de schedules existentes - usa la fecha solicitada (el trigger de BD detecta conflictos reales)
- **Fix: sin page reload**: Reemplazado `window.location.reload()` con `refetchSchedules()` para actualizar datos sin recargar página
- **Fix: hora local**: Cambiado `toISOString()` por `toLocalISOString()` para enviar hora local sin conversión a UTC

#### Archivos Modificados
- `apps/web/components/plan-master/weekly-grid/WeeklyPlanGrid.tsx` - Auto-cascade + fixes de timezone
- `apps/api/app/api/routes/production/cascade.py` - Ignorar work_center_id, usar production_routes

#### Fixes Adicionales (sesion PM)
- **Fix: T1 schedules en dia correcto**: Schedules que empiezan a las 22:00 ahora se muestran en la columna del dia siguiente (al que pertenecen)
- **Fix: shiftNumber calculado**: El turno se calcula de la hora real de inicio, no del valor en BD
- **Fix: Cascada encola en centros secuenciales**: Ahora verifica schedules existentes y encola nuevos batches despues
- **Fix: Solo considera schedules de la semana**: Queue y cascada solo consideran schedules que EMPIECEN dentro de la semana seleccionada
- **Fix: Limites de semana correctos**: Semana va de Sabado 22:00 a Sabado 22:00 (no Domingo 6am)

#### Archivos Modificados (sesion PM)
- `apps/web/hooks/use-shift-schedules.ts` - Calculo de dayIndex y shiftNumber basado en hora real
- `apps/api/app/api/routes/production/cascade.py` - Queue con filtro de semana, limites Sab 22:00
- `apps/api/docs/CASCADE-PRODUCTION.md` - Documentacion tecnica completa del sistema
