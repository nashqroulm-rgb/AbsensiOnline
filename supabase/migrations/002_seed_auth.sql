INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at, confirmation_token, recovery_token
) VALUES
  (
    'c0000000-0000-4000-8000-000000000011',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    '080000000001@absensi.local',
    extensions.crypt('1234', extensions.gen_salt('bf')),
    now(),
    '{"nama":"Admin Sistem","role":"admin","no_hp":"080000000001"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    now(), now(), '', ''
  ),
  (
    'c0000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    '081234567890@absensi.local',
    extensions.crypt('1234', extensions.gen_salt('bf')),
    now(),
    '{"nama":"Budi Santoso","role":"worker","no_hp":"081234567890"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    now(), now(), '', ''
  )
ON CONFLICT (id) DO NOTHING;
