/*
  # Add Voice Gender to Tuner History

  1. Changes
    - Add `voice_gender` column to `tuner_history` table
    - Add check constraint to ensure valid gender values
*/

ALTER TABLE public.tuner_history
ADD COLUMN voice_gender text NOT NULL DEFAULT 'female'
CHECK (voice_gender IN ('male', 'female'));