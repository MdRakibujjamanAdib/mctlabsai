/*
  # Add Speech to Text Support

  1. Changes
    - Update chat_messages table type check to include 'speech-to-text'
    - Add index for speech-to-text messages
    - Add trigger for speech-to-text stats tracking

  2. Security
    - Maintain existing RLS policies
*/

-- Update the type check constraint to include speech-to-text
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_type_check;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_type_check 
  CHECK (type IN ('general', 'coder', 'image', 'speech-to-text'));

-- Create index for speech-to-text messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_speech_to_text 
  ON public.chat_messages (user_id, type) 
  WHERE type = 'speech-to-text';

-- Add speech-to-text count to user_stats
ALTER TABLE public.user_stats 
  ADD COLUMN IF NOT EXISTS total_speech_to_text integer DEFAULT 0;

-- Create function to track speech-to-text usage
CREATE OR REPLACE FUNCTION public.increment_speech_to_text_count()
RETURNS trigger AS $$
BEGIN
  IF NEW.type = 'speech-to-text' THEN
    UPDATE public.user_stats 
    SET 
      total_speech_to_text = total_speech_to_text + 1,
      last_active_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for speech-to-text tracking
DROP TRIGGER IF EXISTS on_speech_to_text_created ON public.chat_messages;
CREATE TRIGGER on_speech_to_text_created
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  WHEN (NEW.type = 'speech-to-text')
  EXECUTE FUNCTION public.increment_speech_to_text_count();