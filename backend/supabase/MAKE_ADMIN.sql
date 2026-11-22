ALTER TABLE public.profiles DISABLE TRIGGER trg_prevent_role_elevation;

UPDATE public.profiles
SET role = 'admin', full_name = 'Store Owner'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@megamart.com');

INSERT INTO public.profiles (id, full_name, role)
SELECT id, 'Store Owner', 'admin'
FROM auth.users
WHERE email = 'admin@megamart.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = 'Store Owner';

ALTER TABLE public.profiles ENABLE TRIGGER trg_prevent_role_elevation;
