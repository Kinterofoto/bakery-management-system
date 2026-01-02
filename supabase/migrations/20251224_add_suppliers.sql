-- Add suppliers to compras.suppliers table
INSERT INTO compras.suppliers (company_name, nit, contact_person_name, status, notes)
VALUES
  ('DON BATTEL', 'DON-BATTEL-001', NULL, 'active', 'Proveedor de harina'),
  ('PROCOHOHARINAS', 'PROCOHARINA-001', NULL, 'active', 'Proveedor de harina y productos de panadería'),
  ('DIEZ EQUIS', 'DIEZ-EQUIS-001', NULL, 'active', 'Proveedor de margarina y cremas'),
  ('VILASECA', 'VILASECA-001', NULL, 'active', 'Proveedor de jamón y tocineta'),
  ('OVOCOLOMBIA', 'OVOCOLOMBIA-001', NULL, 'active', 'Proveedor de huevo pasteurizado'),
  ('EDEXA', 'EDEXA-001', NULL, 'active', 'Proveedor de margarina y productos de repostería'),
  ('EUROGEM', 'EUROGEM-001', NULL, 'active', 'Proveedor de chocolate y mejoradores')
ON CONFLICT (nit) DO NOTHING;
