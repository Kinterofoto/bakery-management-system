# Ejecutar Migración de Inventarios

Para que el módulo CountPro funcione correctamente, necesitas ejecutar el script de base de datos que crea las tablas necesarias.

## Opción 1: Supabase Dashboard (Recomendado)

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a la pestaña "SQL Editor"
3. Copia y pega el contenido completo del archivo `scripts/11-create-inventory-tables.sql`
4. Ejecuta el script haciendo clic en "Run"

## Opción 2: CLI de Supabase

Si tienes configurado el CLI de Supabase:

```bash
supabase db push
```

## Opción 3: Conexión directa con psql

Si tienes acceso directo a tu base de datos:

```bash
psql "postgresql://[your-connection-string]" -f scripts/11-create-inventory-tables.sql
```

## Tablas que se crearán:

- `inventories` - Sesiones de inventario
- `inventory_counts` - Conteos individuales (1er y 2do conteo)
- `inventory_count_items` - Items contados en cada sesión
- `inventory_reconciliations` - Conciliación entre conteos
- `inventory_final_results` - Resultados finales después de conciliación

## Verificar que funcionó:

Después de ejecutar el script, verifica en tu Supabase Dashboard > Table Editor que las 5 tablas nuevas aparezcan en la lista de tablas.

## Nota importante:

Las columnas `final_total_grams` en ambas tablas `inventory_reconciliations` e `inventory_final_results` son **columnas calculadas automáticamente** - no se insertan manualmente, se calculan como `final_quantity * final_grams_per_unit`.