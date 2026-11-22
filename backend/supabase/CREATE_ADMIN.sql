-- 1. Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create admin user with password 'Admin@123456'
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

-- 3. Set role to admin in profiles
INSERT INTO public.profiles (id, full_name, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@megamart.com'),
  'Store Owner',
  'admin'
) ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  full_name = 'Store Owner';
