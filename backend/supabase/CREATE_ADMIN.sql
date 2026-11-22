-- 1. Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Update the role elevation trigger to allow direct database admin/SQL editor (auth.uid() IS NULL)
CREATE OR REPLACE FUNCTION public.prevent_self_role_elevation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Unauthorized: Only an existing admin can modify user roles';
    END IF;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 3. Temporarily disable trigger on profiles to guarantee role update
ALTER TABLE public.profiles DISABLE TRIGGER trg_prevent_role_elevation;

-- 4. Create admin user in auth.users with password 'Admin@123456'
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@megamart.com',
  crypt('Admin@123456', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Store Owner"}',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  encrypted_password = crypt('Admin@123456', gen_salt('bf')),
  email_confirmed_at = NOW();

-- 5. Set role to admin in profiles
INSERT INTO public.profiles (id, full_name, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@megamart.com'),
  'Store Owner',
  'admin'
) ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  full_name = 'Store Owner';

-- 6. Re-enable trigger on profiles
ALTER TABLE public.profiles ENABLE TRIGGER trg_prevent_role_elevation;
