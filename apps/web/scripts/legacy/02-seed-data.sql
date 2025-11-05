-- Seed data for testing

-- Insert sample users
INSERT INTO users (email, name, role) VALUES
('admin@panaderia.com', 'Administrador Sistema', 'admin'),
('revisor1@panaderia.com', 'María González', 'reviewer_area1'),
('revisor2@panaderia.com', 'Carlos Rodríguez', 'reviewer_area2'),
('despachador@panaderia.com', 'Ana López', 'dispatcher'),
('conductor1@panaderia.com', 'Pedro Martínez', 'driver'),
('comercial@panaderia.com', 'Laura Fernández', 'commercial');

-- Insert sample clients
INSERT INTO clients (name, contact_person, phone, email, address) VALUES
('Supermercado Central', 'Juan Pérez', '+57 300 123 4567', 'compras@supercentral.com', 'Calle 123 #45-67, Bogotá'),
('Panadería El Trigo', 'Carmen Silva', '+57 301 234 5678', 'gerencia@eltrigo.com', 'Carrera 78 #12-34, Medellín'),
('Distribuidora Norte', 'Roberto Gómez', '+57 302 345 6789', 'pedidos@distnorte.com', 'Avenida 45 #23-56, Cali'),
('Café & Pan', 'Sofía Herrera', '+57 303 456 7890', 'sofia@cafepan.com', 'Calle 67 #89-12, Barranquilla');

-- Insert sample products
INSERT INTO products (name, description, unit, price) VALUES
('Pan Integral', 'Pan integral de 500g', 'unidades', 3500.00),
('Pan Blanco', 'Pan blanco tradicional 400g', 'unidades', 2800.00),
('Croissant', 'Croissant de mantequilla', 'unidades', 4200.00),
('Pan de Hamburguesa', 'Pan para hamburguesa', 'unidades', 1500.00),
('Pan Dulce', 'Pan dulce con pasas', 'unidades', 3800.00),
('Baguette', 'Baguette francesa', 'unidades', 4500.00),
('Pan de Centeno', 'Pan de centeno 450g', 'unidades', 4000.00),
('Rosquillas', 'Rosquillas tradicionales', 'docenas', 8500.00);

-- Insert sample orders
INSERT INTO orders (order_number, client_id, expected_delivery_date, observations, status, created_by) VALUES
('ORD-2025-001', (SELECT id FROM clients WHERE name = 'Supermercado Central'), '2025-07-16', 'Entrega temprana preferible', 'received', (SELECT id FROM users WHERE role = 'admin')),
('ORD-2025-002', (SELECT id FROM clients WHERE name = 'Panadería El Trigo'), '2025-07-17', 'Producto fresco requerido', 'review_area1', (SELECT id FROM users WHERE role = 'admin')),
('ORD-2025-003', (SELECT id FROM clients WHERE name = 'Distribuidora Norte'), '2025-07-18', NULL, 'review_area2', (SELECT id FROM users WHERE role = 'admin'));

-- Insert sample order items
INSERT INTO order_items (order_id, product_id, quantity_requested, quantity_available, availability_status) VALUES
-- Order 1
((SELECT id FROM orders WHERE order_number = 'ORD-2025-001'), (SELECT id FROM products WHERE name = 'Pan Integral'), 100, 0, 'pending'),
((SELECT id FROM orders WHERE order_number = 'ORD-2025-001'), (SELECT id FROM products WHERE name = 'Pan Blanco'), 150, 0, 'pending'),
((SELECT id FROM orders WHERE order_number = 'ORD-2025-001'), (SELECT id FROM products WHERE name = 'Croissant'), 50, 0, 'pending'),
-- Order 2
((SELECT id FROM orders WHERE order_number = 'ORD-2025-002'), (SELECT id FROM products WHERE name = 'Baguette'), 80, 80, 'available'),
((SELECT id FROM orders WHERE order_number = 'ORD-2025-002'), (SELECT id FROM products WHERE name = 'Pan Dulce'), 60, 40, 'partial'),
-- Order 3
((SELECT id FROM orders WHERE order_number = 'ORD-2025-003'), (SELECT id FROM products WHERE name = 'Pan de Hamburguesa'), 200, 150, 'partial'),
((SELECT id FROM orders WHERE order_number = 'ORD-2025-003'), (SELECT id FROM products WHERE name = 'Rosquillas'), 25, 25, 'available');

-- Update missing quantities
UPDATE order_items SET quantity_missing = quantity_requested - quantity_available WHERE availability_status = 'partial';
