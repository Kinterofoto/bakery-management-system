-- Agregar columna de cédula a la tabla users
-- Este campo almacenará el número de cédula o documento de identidad del usuario
-- Se utilizará principalmente para identificar vendedores en exportaciones de facturación

ALTER TABLE users
ADD COLUMN cedula VARCHAR(20);

-- Crear índice para búsquedas rápidas por cédula
CREATE INDEX idx_users_cedula ON users(cedula);

-- Comentario para documentación
COMMENT ON COLUMN users.cedula IS 'Número de cédula o documento de identidad del usuario. Usado en exportaciones para identificar vendedores.';

-- Verificación: Listar usuarios sin cédula
-- SELECT id, name, email, role, cedula FROM users WHERE role = 'commercial' ORDER BY name;
