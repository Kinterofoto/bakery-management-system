-- Migration: Add super_admin role to users table
-- Description: Creates a new super_admin role that has access to user management and all system features

-- Add super_admin to the role check constraint
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
ADD CONSTRAINT users_role_check CHECK (
  (role)::text = ANY (
    ARRAY[
      'super_admin'::character varying,
      'admin'::character varying,
      'administrator'::character varying,
      'coordinador_logistico'::character varying,
      'commercial'::character varying,
      'reviewer'::character varying,
      'reviewer_area1'::character varying,
      'reviewer_area2'::character varying,
      'dispatcher'::character varying,
      'driver'::character varying,
      'client'::character varying
    ]::text[]
  )
);

-- Add comment explaining the super_admin role
COMMENT ON CONSTRAINT users_role_check ON public.users IS
  'super_admin: Full system access including user management
   admin: Legacy admin role
   administrator: Standard administrator
   coordinador_logistico: Logistics coordinator
   commercial: Sales representative
   reviewer: Order reviewer
   reviewer_area1: First area reviewer
   reviewer_area2: Second area reviewer
   dispatcher: Dispatch coordinator
   driver: Delivery driver
   client: Customer account';
