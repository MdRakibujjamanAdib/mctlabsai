import { supabase } from './supabase';

export async function createInitialUser() {
  try {
    // First check if user exists
    const { data: existingUser } = await supabase.auth.signInWithPassword({
      email: 'adib@diu.mct',
      password: '123456789//Aa'
    });

    if (existingUser.user) {
      console.log('User already exists, you can login with these credentials');
      return existingUser;
    }

    // If user doesn't exist, create new user
    const { data, error } = await supabase.auth.signUp({
      email: 'adib@diu.mct',
      password: '123456789//Aa',
      options: {
        emailRedirectTo: window.location.origin
      }
    });

    if (error) {
      throw error;
    }

    console.log('User created successfully! You can now login with these credentials');
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}