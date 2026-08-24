-- Enable RLS on all tables if not already enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow anon read users" ON public.users;
DROP POLICY IF EXISTS "Allow anon read attachments" ON public.attachments;
DROP POLICY IF EXISTS "Allow anon read shifts" ON public.shifts;
DROP POLICY IF EXISTS "Allow anon read zones" ON public.zones;

-- Create policies for anonymous users to read all rows (for public data)
CREATE POLICY "Allow anon read users" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Allow anon read attachments" ON public.attachments
  FOR SELECT USING (true);

CREATE POLICY "Allow anon read shifts" ON public.shifts
  FOR SELECT USING (true);

CREATE POLICY "Allow anon read zones" ON public.zones
  FOR SELECT USING (true);

-- Optional: Add policies for authenticated users to insert/update their own data
-- (You may need to adjust these based on your app's requirements)
-- Example for users to update their own record:
-- CREATE POLICY "Allow users to update own record" ON public.users
--   FOR UPDATE USING (auth.uid() = id);