/*
  # Add insert policy for profiles table

  1. Security Changes
    - Add RLS policy to allow users to insert their own profile
    - Policy ensures users can only create a profile with their own user ID
    - Maintains data integrity and security by enforcing user-specific profile creation

  Note: Existing policies for SELECT and UPDATE remain unchanged
*/

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO public
WITH CHECK (auth.uid() = id);