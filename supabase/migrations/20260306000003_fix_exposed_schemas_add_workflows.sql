-- Fix: restore workflows schema that was removed by migration 20260306000002
-- That migration overwrote pgrst.db_schemas without including workflows,
-- which broke the email inbox (order-management/inbox).

ALTER ROLE "authenticator" SET pgrst.db_schemas TO 'public,produccion,compras,investigacion,workflows,visitas,inventario,graphql_public';

NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
