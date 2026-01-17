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
- [x] **TEST CONFLICTOS**: Dos producciones simultaneas con centros compartidos

---

## Fase 2: Frontend
- [x] Crear hook `use-cascade-production.ts` para API
- [x] Crear `CascadePreviewModal.tsx` para preview de cascada
- [x] Agregar boton "Crear en Cascada" en AddProductionModal
- [x] Integrar en WeeklyPlanGrid
- [ ] Probar flujo completo en navegador

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
