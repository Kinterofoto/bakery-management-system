-- Create video_tutorials table for storing YouTube tutorial links per module
CREATE TABLE IF NOT EXISTS public.video_tutorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_path TEXT NOT NULL UNIQUE,
  video_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for fast lookups by module_path
CREATE INDEX idx_video_tutorials_module_path ON public.video_tutorials(module_path);

-- Create index for created_by for admin queries
CREATE INDEX idx_video_tutorials_created_by ON public.video_tutorials(created_by);

-- Enable Row Level Security
ALTER TABLE public.video_tutorials ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All authenticated users can SELECT (view videos)
CREATE POLICY "Authenticated users can view video tutorials"
  ON public.video_tutorials
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Only super_admin can INSERT
CREATE POLICY "Super admins can create video tutorials"
  ON public.video_tutorials
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- RLS Policy: Only super_admin can UPDATE
CREATE POLICY "Super admins can update video tutorials"
  ON public.video_tutorials
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- RLS Policy: Only super_admin can DELETE
CREATE POLICY "Super admins can delete video tutorials"
  ON public.video_tutorials
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_video_tutorials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER video_tutorials_updated_at
  BEFORE UPDATE ON public.video_tutorials
  FOR EACH ROW
  EXECUTE FUNCTION update_video_tutorials_updated_at();

-- Grant permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_tutorials TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.video_tutorials IS 'Stores YouTube video tutorial links for each module/page';
COMMENT ON COLUMN public.video_tutorials.module_path IS 'Unique identifier for the page/module (e.g., /crm, /produccion, /order-management/dashboard)';
COMMENT ON COLUMN public.video_tutorials.video_url IS 'Full YouTube video URL (will be converted to embed format)';
COMMENT ON COLUMN public.video_tutorials.title IS 'Optional custom title for the tutorial (defaults to module name)';
COMMENT ON COLUMN public.video_tutorials.description IS 'Optional description of what the tutorial covers';
