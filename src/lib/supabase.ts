import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a mock client if Supabase credentials are not provided
// This allows the app to run when using Firebase instead of Supabase
const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not found. Creating mock client for Firebase compatibility.');
    // Return a mock client that won't cause errors
    return null;
  }
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
};

export const supabase = createSupabaseClient();

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
export type UserSettings = Database['public']['Tables']['user_settings']['Row'];
export type UserStats = Database['public']['Tables']['user_stats']['Row'];