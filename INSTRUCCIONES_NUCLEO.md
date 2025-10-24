# Instrucciones para Activar el Módulo Núcleo

## ⚠️ Paso Obligatorio: Ejecutar Migración en Supabase

El módulo Núcleo requiere crear nuevas tablas en la base de datos. Sigue estos pasos:

### 1. Accede a Supabase Dashboard
- Ve a https://supabase.com
- Entra a tu proyecto
- Ve a **SQL Editor** (en el menú lateral izquierdo)

### 2. Ejecuta la Migración
- Abre el archivo `NUCLEO_MIGRATION.sql` de este proyecto
- **Copia TODO el contenido** del archivo
- Pégalo en el SQL Editor de Supabase
- Haz click en **"Run"** (esquina inferior derecha)

### 3. Verifica que Funcionó
Ejecuta esta consulta para verificar:
```sql
SELECT * FROM product_completeness LIMIT 5;
```

Si ves resultados (tus productos con % de completitud), ¡está listo! ✅

---

## 📋 ¿Qué hace esta migración?

Crea 8 nuevas tablas:
1. `product_technical_specs` - Especificaciones técnicas
2. `product_quality_specs` - Parámetros de calidad
3. `product_production_process` - Procesos detallados
4. `product_costs` - Estructura de costos
5. `product_price_lists` - Múltiples listas de precios
6. `product_commercial_info` - Info comercial y marketing
7. `product_media` - Imágenes y documentos
8. `product_inventory_config` - Configuración de inventario

Y crea 1 vista:
- `product_completeness` - Calcula automáticamente el % de info completa

---

## 🎯 Características del Módulo Núcleo

### Vista Principal (`/nucleo`)
- Grid de productos con cards visuales
- Indicador de completitud por producto (%)
- Filtros por categoría (PT/MP)
- Búsqueda por nombre/descripción
- Badges visuales de qué información tiene cada producto

### Vista de Detalle (`/nucleo/[id]`)
7 Tabs organizados:

1. **General** - Información básica del producto
2. **Técnicas** - Especificaciones técnicas (peso, dimensiones, vida útil)
3. **Calidad** - Parámetros de calidad y control
4. **Producción** - Procesos y BOM (integrado con `produccion.bill_of_materials`)
5. **Costos** - Estructura de costos y análisis financiero
6. **Comercial** - Listas de precios y datos de marketing
7. **Inventario** - Configuración de stock y rotación

### Indicadores Visuales
- ✅ Progress bar de completitud general
- ✅ Iconos de check/alerta por sección
- ✅ Colores: Verde (completo), Amarillo (en progreso), Rojo (incompleto)
- ✅ Grid de estado por todas las secciones

---

## 🔐 Permisos

Actualmente el módulo usa el permiso `production`. 

Los usuarios con permiso de producción pueden acceder al módulo completo.

---

## 📝 Próximos Pasos (Opcional)

Después de ejecutar la migración, puedes:

1. **Crear un permiso específico** `nucleo` en la tabla `users.permissions`
2. **Agregar formularios de edición** en cada tab (actualmente son solo vistas)
3. **Integrar con Supabase Storage** para la tabla `product_media`
4. **Agregar validaciones** con Zod en los formularios

---

## ❓ Troubleshooting

### Error: "relation public.product_completeness does not exist"
→ No has ejecutado la migración en Supabase. Ve al paso 1.

### Error: "permission denied for schema produccion"
→ Tu usuario de Supabase necesita acceso al schema `produccion`. Ejecuta:
```sql
GRANT USAGE ON SCHEMA produccion TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA produccion TO authenticated;
```

### No veo el módulo en el menú principal
→ Verifica que tu usuario tenga el permiso `production: true` en la base de datos.

---

¡Listo! Una vez ejecutada la migración, el módulo Núcleo estará completamente funcional. 🚀
