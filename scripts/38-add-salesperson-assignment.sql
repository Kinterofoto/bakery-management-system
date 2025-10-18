-- Script para configurar la asignación de vendedores a clientes
-- La columna assigned_user_id ya existe en la tabla clients (agregada para funcionalidad CRM)
-- Este script solo agrega constraints y documentación para el uso específico de vendedores

-- Agregar foreign key constraint para assigned_user_id si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_clients_assigned_user'
  ) THEN
    ALTER TABLE clients
    ADD CONSTRAINT fk_clients_assigned_user
    FOREIGN KEY (assigned_user_id)
    REFERENCES users(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Crear índice para mejorar consultas si no existe
CREATE INDEX IF NOT EXISTS idx_clients_assigned_user
ON clients(assigned_user_id);

-- Comentario para documentación
COMMENT ON COLUMN clients.assigned_user_id IS 'ID del vendedor (usuario con rol commercial) asignado al cliente. Puede ser NULL si no tiene vendedor asignado.';

-- Verificación: Mostrar clientes sin vendedor asignado
-- SELECT id, name, assigned_user_id FROM clients WHERE assigned_user_id IS NULL;

-- Verificación: Mostrar asignaciones de vendedores
-- SELECT
--   c.name as cliente,
--   u.name as vendedor
-- FROM clients c
-- LEFT JOIN users u ON c.assigned_user_id = u.id
-- WHERE u.role = 'commercial' OR c.assigned_user_id IS NULL
-- ORDER BY u.name, c.name;
