import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { logSecurityEvent, updateLastActivity } from '../lib/security';
import { validateDIUEmail } from '../lib/authGuard';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        updateLastActivity();
        logSecurityEvent('USER_SESSION_ACTIVE', user);
      }
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await logSecurityEvent('SIGN_IN_ATTEMPT', null, { email });
      
      // Additional validation for production
      if (import.meta.env.PROD && email !== 'admin@mctlabs.tech' && !validateDIUEmail(email)) {
        await logSecurityEvent('INVALID_EMAIL_FORMAT_LOGIN', null, { email });
        throw new Error('Only DIU MCT student emails are allowed');
      }
      
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      await logSecurityEvent('SIGN_IN_FAILED', null, { email, error: error.message });
      throw new Error(error.message || 'Failed to sign in');
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      await logSecurityEvent('SIGN_UP_ATTEMPT', null, { email });
      
      // Validate DIU email format for students
      if (!validateDIUEmail(email)) {
        await logSecurityEvent('INVALID_EMAIL_SIGNUP_ATTEMPT', null, { email });
        throw new Error('Only DIU MCT student emails are allowed for registration');
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, {
        displayName: displayName
      });
      
      await logSecurityEvent('SIGN_UP_SUCCESS', userCredential.user);
    } catch (error: any) {
      await logSecurityEvent('SIGN_UP_FAILED', null, { email, error: error.message });
      throw new Error(error.message || 'Failed to create account');
    }
  };

  const signOut = async () => {
    try {
      await logSecurityEvent('SIGN_OUT', auth.currentUser);
      localStorage.removeItem('lastActivity');
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}