/*
  # Add Admin Management Support

  1. New Tables
    - `admin_credentials`: Stores admin user configuration
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `password_hash` (text)
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Only admins can access this table
*/

-- Create admin_credentials table
CREATE TABLE IF NOT EXISTS public.admin_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Only admins can view admin credentials"
  ON public.admin_credentials FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_app_meta_data->>'role' = 'admin'
  ));

CREATE POLICY "Only admins can modify admin credentials"
  ON public.admin_credentials
  USING (EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_app_meta_data->>'role' = 'admin'
  ));

-- Function to update admin user
CREATE OR REPLACE FUNCTION update_admin_user(
  admin_email text,
  admin_password text
) RETURNS void AS $$
BEGIN
  -- Update auth.users table
  UPDATE auth.users
  SET 
    email = admin_email,
    encrypted_password = crypt(admin_password, gen_salt('bf'))
  WHERE raw_app_meta_data->>'role' = 'admin';

  -- Update admin_credentials table
  INSERT INTO public.admin_credentials (
    email,
    password_hash,
    is_active
  )
  VALUES (
    admin_email,
    crypt(admin_password, gen_salt('bf')),
    true
  )
  ON CONFLICT (email) 
  DO UPDATE SET
    password_hash = crypt(admin_password, gen_salt('bf')),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default admin credentials
INSERT INTO public.admin_credentials (
  email,
  password_hash,
  is_active
)
VALUES (
  'admin@mctlabs.tech',
  crypt('adib', gen_salt('bf')),
  true
)
ON CONFLICT (email) DO NOTHING;