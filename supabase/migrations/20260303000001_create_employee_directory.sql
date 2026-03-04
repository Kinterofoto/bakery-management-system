-- Employee directory table for HR management
-- Stores comprehensive employee information for both PASTRY CHEF and PASTRYCOL companies

CREATE TABLE IF NOT EXISTS public.employee_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT NOT NULL DEFAULT 'PASTRY CHEF',
  document_type TEXT,
  document_number TEXT,
  full_name TEXT NOT NULL,
  salary TEXT,
  position TEXT,
  hire_date TEXT,
  probation_end_date TEXT,
  birth_date TEXT,
  birth_place TEXT,
  gender TEXT,
  blood_type TEXT,
  phone TEXT,
  email TEXT,
  smokes TEXT DEFAULT 'No',
  marital_status TEXT,
  address TEXT,
  housing_type TEXT,
  neighborhood TEXT,
  locality TEXT,
  estrato TEXT,
  education_level TEXT,
  bank TEXT,
  bank_account TEXT,
  eps TEXT,
  pension_fund TEXT,
  severance_fund TEXT,
  is_allergic TEXT DEFAULT 'No',
  allergy_details TEXT,
  has_disease TEXT DEFAULT 'No',
  disease_details TEXT,
  has_disability TEXT DEFAULT 'No',
  disability_details TEXT,
  has_dependents_company TEXT DEFAULT 'No',
  is_head_household TEXT DEFAULT 'No',
  has_dependents_home TEXT DEFAULT 'No',
  num_dependents TEXT,
  emergency_contact_name TEXT,
  emergency_contact_relationship TEXT,
  emergency_contact_phone TEXT,
  has_children TEXT DEFAULT 'No',
  num_children TEXT,
  child1_name TEXT,
  child1_birthdate TEXT,
  child2_name TEXT,
  child2_birthdate TEXT,
  child3_name TEXT,
  child3_birthdate TEXT,
  child4_name TEXT,
  child4_birthdate TEXT,
  child5_name TEXT,
  child5_birthdate TEXT,
  pants_size TEXT,
  shirt_size TEXT,
  boots_size TEXT,
  status TEXT DEFAULT 'Activo',
  retirement_date TEXT,
  resignation_reason TEXT,
  received_onboarding TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_directory ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage employee directory
CREATE POLICY "Allow authenticated access to employee_directory"
  ON public.employee_directory
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Index for company filtering
CREATE INDEX idx_employee_directory_company ON public.employee_directory(company);
CREATE INDEX idx_employee_directory_status ON public.employee_directory(status);
CREATE INDEX idx_employee_directory_document ON public.employee_directory(document_number);
