/*
  # Add User Plans and Subscriptions Support

  1. New Tables
    - `plans`: Available subscription plans
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `features` (jsonb)
      - `limits` (jsonb)
      - `pricing` (jsonb)
      
    - `user_subscriptions`: User plan subscriptions
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `plan_id` (uuid, references plans)
      - `status` (text) - active, pending, cancelled
      - `usage` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      
    - `subscription_requests`: Plan change/approval requests
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `plan_id` (uuid, references plans)
      - `status` (text) - pending, approved, rejected
      - `notes` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for users and admins
*/

-- Create plans table
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  features jsonb DEFAULT '{}'::jsonb,
  limits jsonb DEFAULT '{}'::jsonb,
  pricing jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES plans(id) ON DELETE RESTRICT NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'pending', 'cancelled')),
  usage jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create subscription_requests table
CREATE TABLE IF NOT EXISTS public.subscription_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES plans(id) ON DELETE RESTRICT NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for plans
CREATE POLICY "Plans are viewable by everyone"
  ON public.plans FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify plans"
  ON public.plans
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'));

-- Create policies for user_subscriptions
CREATE POLICY "Users can view own subscription"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
  ));

CREATE POLICY "Only admins can modify subscriptions"
  ON public.user_subscriptions
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'));

-- Create policies for subscription_requests
CREATE POLICY "Users can view own requests"
  ON public.subscription_requests FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
  ));

CREATE POLICY "Users can create requests"
  ON public.subscription_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Only admins can update requests"
  ON public.subscription_requests FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'));

-- Create indexes
CREATE INDEX IF NOT EXISTS user_subscriptions_user_id_idx ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS user_subscriptions_plan_id_idx ON public.user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS subscription_requests_user_id_idx ON public.subscription_requests(user_id);
CREATE INDEX IF NOT EXISTS subscription_requests_status_idx ON public.subscription_requests(status);

-- Insert default plans
INSERT INTO public.plans (name, description, features, limits, pricing)
VALUES 
  (
    'Free',
    'Basic features with limited usage',
    '{"chat": true, "echo": true, "image": true, "speech_to_text": true}'::jsonb,
    '{"image_daily_limit": 50}'::jsonb,
    '{}'::jsonb
  ),
  (
    'Student',
    'Unlimited access for verified students',
    '{"chat": true, "echo": true, "image": true, "animation": true, "3d": true, "tuner": true}'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb
  ),
  (
    'Pay as You Go',
    'Pay only for what you use',
    '{"chat": true, "echo": true, "image": true, "animation": true, "3d": true, "tuner": true}'::jsonb,
    '{"free_image_limit": 250}'::jsonb,
    '{"image_cost": 1, "animation_cost": 2}'::jsonb
  );

-- Function to check and update usage limits
CREATE OR REPLACE FUNCTION check_usage_limits()
RETURNS trigger AS $$
DECLARE
  user_plan RECORD;
  daily_usage INTEGER;
BEGIN
  -- Get user's subscription and plan
  SELECT s.*, p.* 
  INTO user_plan
  FROM user_subscriptions s
  JOIN plans p ON s.plan_id = p.id
  WHERE s.user_id = NEW.user_id
  AND s.status = 'active';

  -- If no active subscription, default to free plan
  IF NOT FOUND THEN
    SELECT * INTO user_plan FROM plans WHERE name = 'Free';
  END IF;

  -- Check limits based on operation type
  IF NEW.type = 'image' THEN
    -- Check daily limit for free plan
    IF user_plan.name = 'Free' THEN
      SELECT COUNT(*) INTO daily_usage
      FROM chat_messages
      WHERE user_id = NEW.user_id
      AND type = 'image'
      AND created_at >= CURRENT_DATE;

      IF daily_usage >= (user_plan.limits->>'image_daily_limit')::integer THEN
        RAISE EXCEPTION 'Daily image generation limit reached';
      END IF;
    END IF;
  END IF;

  -- Update usage statistics
  UPDATE user_subscriptions
  SET 
    usage = jsonb_set(
      COALESCE(usage, '{}'::jsonb),
      ARRAY[NEW.type],
      COALESCE(usage->>NEW.type, '0')::integer + 1
    ),
    updated_at = now()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for usage tracking
DROP TRIGGER IF EXISTS check_usage_limits_trigger ON chat_messages;
CREATE TRIGGER check_usage_limits_trigger
  BEFORE INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION check_usage_limits();