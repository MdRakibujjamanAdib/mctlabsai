/*
  # Add 3D Model and Animation Support

  1. Changes
    - Update chat_messages table type check to include '3d_model'
    - Add video_url column for animations and 3D model previews
    - Add index for 3D model messages
    - Add history_items table for unified history tracking

  2. Security
    - Maintain existing RLS policies
    - Add RLS policies for history_items (if not exists)
*/

-- Update the type check constraint to include 3d_model
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_type_check;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_type_check 
  CHECK (type IN ('general', 'coder', 'image', 'speech-to-text', '3d_model'));

-- Add video_url column for animations and 3D model previews
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS video_url text;

-- Create index for 3D model messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_video 
  ON public.chat_messages (user_id, type) 
  WHERE type = '3d_model';

-- Create history_items table for unified history tracking
CREATE TABLE IF NOT EXISTS public.history_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL, -- Valid types: animation, chat, image, etc.
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.history_items ENABLE ROW LEVEL SECURITY;

-- Create policies for history_items if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'history_items' 
    AND policyname = 'Users can view own history items'
  ) THEN
    CREATE POLICY "Users can view own history items"
      ON public.history_items FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'history_items' 
    AND policyname = 'Users can insert own history items'
  ) THEN
    CREATE POLICY "Users can insert own history items"
      ON public.history_items FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'history_items' 
    AND policyname = 'Users can delete own history items'
  ) THEN
    CREATE POLICY "Users can delete own history items"
      ON public.history_items FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create indexes for history_items
CREATE INDEX IF NOT EXISTS history_items_user_id_idx ON public.history_items(user_id);
CREATE INDEX IF NOT EXISTS history_items_type_idx ON public.history_items(type);
CREATE INDEX IF NOT EXISTS history_items_created_at_idx ON public.history_items(created_at);

-- Create index for animation history
CREATE INDEX IF NOT EXISTS idx_history_items_animation 
  ON public.history_items (user_id, type) 
  WHERE type = 'animation';