/*
  # Add Tuner History Table

  1. New Tables
    - `tuner_history`: Stores text-to-speech generation history
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `content` (text)
      - `voice_id` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `tuner_history` table
    - Add policies for authenticated users
*/

-- Create tuner_history table
CREATE TABLE IF NOT EXISTS public.tuner_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  voice_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tuner_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own tuner history"
  ON public.tuner_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tuner history"
  ON public.tuner_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tuner history"
  ON public.tuner_history FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS tuner_history_user_id_idx ON public.tuner_history(user_id);
CREATE INDEX IF NOT EXISTS tuner_history_created_at_idx ON public.tuner_history(created_at);