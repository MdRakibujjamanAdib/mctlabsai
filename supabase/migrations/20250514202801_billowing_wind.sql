/*
  # Add Echo Personas Table

  1. New Tables
    - `echo_personas`: Stores user-created Echo personas
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `description` (text)
      - `prompt` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `echo_personas` table
    - Add policies for authenticated users
*/

-- Create echo_personas table
CREATE TABLE IF NOT EXISTS public.echo_personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  prompt text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.echo_personas ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own personas"
  ON public.echo_personas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own personas"
  ON public.echo_personas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personas"
  ON public.echo_personas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own personas"
  ON public.echo_personas FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS echo_personas_user_id_idx ON public.echo_personas(user_id);
CREATE INDEX IF NOT EXISTS echo_personas_created_at_idx ON public.echo_personas(created_at);