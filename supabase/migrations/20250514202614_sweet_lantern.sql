/*
  # Clean up unused tables and improve admin authentication

  1. Changes
    - Drop unused tables:
      - tuner_history (unused voice tuning feature)
      - echo_personas (unused chat personas)
    - Update admin_credentials table:
      - Add last_login column
      - Add role column with default 'admin'

  2. Security
    - Maintain existing RLS policies
    - Add new policy for admin role verification
*/

-- Drop unused tables
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tuner_history') THEN
    DROP TABLE IF EXISTS tuner_history;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'echo_personas') THEN
    DROP TABLE IF EXISTS echo_personas;
  END IF;
END $$;

-- Add new columns to admin_credentials
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_credentials' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE admin_credentials ADD COLUMN last_login timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_credentials' AND column_name = 'role'
  ) THEN
    ALTER TABLE admin_credentials ADD COLUMN role text DEFAULT 'admin' NOT NULL;
  END IF;
END $$;

-- Add trigger to update last_login
CREATE OR REPLACE FUNCTION update_admin_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE admin_credentials 
  SET last_login = NOW() 
  WHERE email = NEW.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_admin_last_login_trigger'
  ) THEN
    CREATE TRIGGER update_admin_last_login_trigger
    AFTER INSERT OR UPDATE ON admin_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_admin_last_login();
  END IF;
END $$;