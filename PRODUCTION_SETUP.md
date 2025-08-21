# Configuración del Módulo de Producción

Este documento explica cómo configurar correctamente el módulo de producción en Supabase.

## Pasos de Configuración

### 1. Ejecutar Scripts de Base de Datos

Ejecuta los siguientes scripts en orden en tu base de datos Supabase:

```sql
-- 1. Crear tablas del módulo de producción
\i scripts/24-create-production-tables.sql

-- 2. Configurar permisos del schema
\i scripts/25-configure-produccion-schema-permissions.sql

-- 3. Cargar datos de ejemplo (OPCIONAL - para pruebas)
\i scripts/26-load-production-sample-data.sql
```

### 2. Configurar Supabase Dashboard

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **Settings → API**
3. En la sección **"Exposed schemas"**, agrega `produccion` a la lista de schemas expuestos
4. Guarda los cambios

### 3. Verificar Configuración

Después de completar los pasos anteriores, verifica que la configuración sea correcta:

#### En la Base de Datos:
```sql
-- Verificar que las tablas existen
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'produccion';

-- Verificar permisos
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'produccion';
```

#### En la Aplicación:
- Navega a `/produccion` en la aplicación
- Intenta crear un centro de trabajo
- Verifica que no aparezcan errores de schema en la consola

## Estructura del Schema Produccion

El schema `produccion` contiene las siguientes tablas:

- `work_centers` - Centros de trabajo
- `production_shifts` - Turnos de producción  
- `shift_productions` - Producciones por turno
- `production_records` - Registros de unidades producidas
- `materials` - Catálogo de materiales
- `bill_of_materials` - Lista de materiales por producto
- `material_consumptions` - Consumos de materiales
- `production_productivity` - Parámetros de productividad
- `production_route_tracking` - Seguimiento de rutas de producción

## Funciones SQL Incluidas

- `calculate_theoretical_production()` - Calcula producción teórica basada en parámetros
- `calculate_theoretical_consumption()` - Calcula consumo teórico de materiales  
- `update_shift_production_totals()` - Actualiza totales automáticamente

## Permisos de Usuario

Para acceder al módulo de producción, los usuarios necesitan:

1. El permiso `production: true` en su perfil de usuario
2. Estar autenticados en el sistema

## Troubleshooting

### Error: "The schema must be one of the following: public, graphql_public"

**Solución**: El schema `produccion` no está expuesto en la API de Supabase.
- Verifica que agregaste `produccion` a "Exposed schemas" en Settings → API
- Ejecuta el script de permisos `25-configure-produccion-schema-permissions.sql`

### Error 404 al acceder a tablas

**Solución**: Las tablas no existen o no tienen los permisos correctos.
- Ejecuta `24-create-production-tables.sql` para crear las tablas
- Ejecuta `25-configure-produccion-schema-permissions.sql` para configurar permisos

### No se pueden ejecutar funciones RPC

**Solución**: Las funciones no tienen permisos de ejecución.
- Verifica que se ejecutó el script de permisos completamente
- Asegúrate de que las funciones están en el schema `produccion`

## Datos de Ejemplo

### Datos Básicos (script 24)
El script `24-create-production-tables.sql` incluye datos básicos:
- 8 materiales básicos (Harina, Azúcar, Sal, Levadura, Mantequilla, Huevos, Leche, Pollo)
- 5 centros de trabajo (Amasado, Armado, Horneado, Decorado, Empacado)

### Datos Completos para Pruebas (script 26)
El script `26-load-production-sample-data.sql` carga datos de ejemplo completos:

#### Bill of Materials Configurado:
- **Pan Integral**: 4 materiales (Harina 320g, Sal 8g, Levadura 6g, Azúcar 12g)
- **Pan Blanco**: 5 materiales (incluye Mantequilla 20g)
- **Croissant**: 5 materiales (incluye Huevos 8g)
- **Pan de Hamburguesa**: 5 materiales optimizado para producción rápida
- **Pan Dulce**: 6 materiales (incluye Leche 15g)
- **Baguette**: 3 materiales básicos (receta francesa tradicional)

#### Rutas de Producción:
- **Productos simples**: Amasado → Armado → Horneado → Empacado
- **Productos premium**: Incluyen etapa de Decorado
- **Secuencia lógica** basada en procesos reales de panadería

#### Parámetros de Productividad:
- **Valores realistas** por centro de trabajo
- **Cuellos de botella identificados** (generalmente Horneado)
- **Diferentes velocidades** según complejidad del producto

Ejemplo: Pan Integral
- Amasado: 150 u/h
- Armado: 180 u/h  
- Horneado: 120 u/h ⚠️ (limitante)
- Empacado: 200 u/h

Estos datos permiten hacer **pruebas completas** del análisis teórico vs real.

## Soporte

Si encuentras problemas durante la configuración:

1. Verifica que todos los scripts se ejecutaron sin errores
2. Confirma que el schema está expuesto en Supabase Dashboard
3. Revisa la consola del navegador para errores específicos
4. Consulta la documentación de [Supabase Custom Schemas](https://supabase.com/docs/guides/api/using-custom-schemas)