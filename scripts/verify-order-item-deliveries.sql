-- Verificar que la tabla order_item_deliveries está correctamente configurada

-- 1. Verificar que la tabla existe
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE tablename = 'order_item_deliveries';

-- 2. Verificar RLS
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'order_item_deliveries';

-- 3. Ver políticas RLS
SELECT
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'order_item_deliveries';

-- 4. Ver permisos
SELECT
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'order_item_deliveries';

-- 5. Contar registros (solo si tienes acceso)
SELECT COUNT(*) as total_deliveries FROM order_item_deliveries;
