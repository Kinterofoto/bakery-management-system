-- Script para actualizar la tabla users con nuevos roles y permisos
-- Fecha: 2025-09-10
-- Descripción: Agrega nuevos roles del sistema modular y permisos granulares de Order Management

-- ============================================================================
-- PASO 1: ACTUALIZAR CONSTRAINT DE ROLES (agregar nuevos, mantener existentes)
-- ============================================================================

-- Eliminar el constraint existente
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Crear el nuevo constraint con roles existentes + nuevos roles
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (
  (role)::text = ANY (
    (
      ARRAY[
        -- Roles existentes (mantenemos todos)
        'admin'::character varying,
        'reviewer_area1'::character varying,
        'reviewer_area2'::character varying,
        'dispatcher'::character varying,
        'driver'::character varying,
        'commercial'::character varying,
        -- Nuevos roles del sistema modular
        'administrator'::character varying,
        'coordinador_logistico'::character varying,
        'comercial'::character varying,
        'reviewer'::character varying
      ]
    )::text[]
  )
);

-- ============================================================================
-- PASO 2: ACTUALIZAR PERMISOS POR DEFECTO EN LA COLUMNA permissions
-- ============================================================================

-- Actualizar el default de la columna permissions para incluir todos los nuevos permisos
ALTER TABLE public.users 
ALTER COLUMN permissions 
SET DEFAULT '{
  "crm": false,
  "users": false, 
  "orders": false,
  "inventory": false,
  "routes": false,
  "clients": false,
  "returns": false,
  "production": false,
  "order_management_dashboard": false,
  "order_management_orders": false,
  "order_management_review_area1": false,
  "order_management_review_area2": false,
  "order_management_dispatch": false,
  "order_management_routes": false,
  "order_management_returns": false,
  "order_management_settings": false
}'::jsonb;

-- ============================================================================
-- PASO 3: ACTUALIZAR USUARIOS EXISTENTES CON NUEVOS PERMISOS
-- ============================================================================

-- Actualizar todos los usuarios existentes para que tengan los nuevos campos de permisos
-- (inicializados en false, luego se pueden actualizar según necesidades)
UPDATE public.users 
SET permissions = permissions || '{
  "routes": false,
  "clients": false,
  "returns": false,
  "production": false,
  "order_management_dashboard": false,
  "order_management_orders": false,
  "order_management_review_area1": false,
  "order_management_review_area2": false,
  "order_management_dispatch": false,
  "order_management_routes": false,
  "order_management_returns": false,
  "order_management_settings": false
}'::jsonb
WHERE permissions IS NOT NULL;

-- ============================================================================
-- PASO 4: MAPEO DE ROLES EXISTENTES A NUEVOS PERMISOS (OPCIONAL)
-- ============================================================================

-- Asignar permisos apropiados a usuarios con roles existentes
-- Esto es opcional y se puede ajustar según las necesidades específicas

-- Usuarios con rol 'admin' obtienen todos los permisos
UPDATE public.users 
SET permissions = '{
  "crm": true,
  "users": true,
  "orders": true,
  "inventory": true,
  "routes": true,
  "clients": true,
  "returns": true,
  "production": true,
  "order_management_dashboard": true,
  "order_management_orders": true,
  "order_management_review_area1": true,
  "order_management_review_area2": true,
  "order_management_dispatch": true,
  "order_management_routes": true,
  "order_management_returns": true,
  "order_management_settings": true
}'::jsonb
WHERE role = 'admin';

-- Usuarios con rol 'commercial' obtienen permisos básicos de pedidos
UPDATE public.users 
SET permissions = permissions || '{
  "orders": true,
  "clients": true,
  "order_management_dashboard": true,
  "order_management_orders": true
}'::jsonb
WHERE role = 'commercial';

-- Usuarios con rol 'reviewer_area1' obtienen permisos de revisión área 1
UPDATE public.users 
SET permissions = permissions || '{
  "orders": true,
  "order_management_dashboard": true,
  "order_management_review_area1": true
}'::jsonb
WHERE role = 'reviewer_area1';

-- Usuarios con rol 'reviewer_area2' obtienen permisos de revisión área 2
UPDATE public.users 
SET permissions = permissions || '{
  "orders": true,
  "order_management_dashboard": true,
  "order_management_review_area2": true
}'::jsonb
WHERE role = 'reviewer_area2';

-- Usuarios con rol 'dispatcher' obtienen permisos de despacho
UPDATE public.users 
SET permissions = permissions || '{
  "routes": true,
  "returns": true,
  "order_management_dispatch": true,
  "order_management_routes": true,
  "order_management_returns": true
}'::jsonb
WHERE role = 'dispatcher';

-- Usuarios con rol 'driver' obtienen solo permisos de rutas
UPDATE public.users 
SET permissions = permissions || '{
  "routes": true,
  "order_management_routes": true
}'::jsonb
WHERE role = 'driver';

-- ============================================================================
-- PASO 5: VERIFICACIONES
-- ============================================================================

-- Verificar que los constraints se aplicaron correctamente
SELECT cc.constraint_name, cc.check_clause 
FROM information_schema.check_constraints cc
JOIN information_schema.table_constraints tc 
  ON cc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'users' 
  AND tc.table_schema = 'public' 
  AND cc.constraint_name = 'users_role_check';

-- Verificar el nuevo default de permissions
SELECT column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public' 
  AND column_name = 'permissions';

-- Contar usuarios por rol
SELECT role, COUNT(*) as total_users
FROM public.users 
GROUP BY role
ORDER BY role;

-- Verificar que todos los usuarios tienen los nuevos campos de permisos
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE permissions ? 'order_management_dashboard') as users_with_new_permissions
FROM public.users;

-- ============================================================================
-- COMENTARIOS Y NOTAS
-- ============================================================================

/*
NOTAS IMPORTANTES:

1. ROLES MANTENIDOS:
   - admin, reviewer_area1, reviewer_area2, dispatcher, driver, commercial

2. ROLES NUEVOS AGREGADOS:
   - administrator, coordinador_logistico, comercial, reviewer

3. PERMISOS EXISTENTES MANTENIDOS:
   - crm, users, orders, inventory

4. PERMISOS NUEVOS AGREGADOS:
   - routes, clients, returns, production
   - order_management_dashboard, order_management_orders
   - order_management_review_area1, order_management_review_area2
   - order_management_dispatch, order_management_routes
   - order_management_returns, order_management_settings

5. MAPEO SUGERIDO DE ROLES ANTIGUOS A NUEVOS:
   - admin → administrator (con todos los permisos)
   - commercial → comercial (permisos básicos)
   - reviewer_area1/reviewer_area2 → reviewer (permisos de revisión)
   - dispatcher, driver → mantener igual

6. SIGUIENTE PASO RECOMENDADO:
   - Migrar usuarios de roles antiguos a nuevos roles si es necesario
   - Ajustar permisos específicos según necesidades del negocio
   - Probar el sistema de autenticación con los nuevos permisos
*/