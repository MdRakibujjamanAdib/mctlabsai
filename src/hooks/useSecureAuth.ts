import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { authGuard, AuthGuardResult, validateSession } from '../lib/authGuard';
import { logSecurityEvent } from '../lib/security';

interface UseSecureAuthOptions {
  requiredRole?: 'student' | 'admin' | 'any';
  redirectOnFail?: boolean;
}

interface UseSecureAuthResult {
  user: User | null;
  loading: boolean;
  authorized: boolean;
  error: string | null;
  authResult: AuthGuardResult | null;
}

export const useSecureAuth = (options: UseSecureAuthOptions = {}): UseSecureAuthResult => {
  const { requiredRole = 'student', redirectOnFail = true } = options;
  const { user, loading } = useAuth();
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authResult, setAuthResult] = useState<AuthGuardResult | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAuthorization();
  }, [user, requiredRole]);

  const checkAuthorization = async () => {
    if (loading) return;
    
    setChecking(true);
    setError(null);

    try {
      // Validate session if user exists
      if (user && !validateSession(user)) {
        await logSecurityEvent('SESSION_EXPIRED', user);
        setError('Session expired. Please sign in again.');
        setAuthorized(false);
        setAuthResult({ allowed: false, reason: 'Session expired', redirectTo: '/login' });
        return;
      }

      // Run auth guard
      const result = await authGuard(user, requiredRole);
      setAuthResult(result);
      setAuthorized(result.allowed);

      if (!result.allowed) {
        setError(result.reason || 'Access denied');
        
        // Log security events
        if (requiredRole === 'admin' && user) {
          await logSecurityEvent('UNAUTHORIZED_ADMIN_ACCESS', user, {
            attemptedRole: requiredRole,
            reason: result.reason,
            route: window.location.pathname
          });
        }

        // Redirect if configured
        if (redirectOnFail && result.redirectTo) {
          window.location.href = result.redirectTo;
        }
      } else {
        // Log successful access for admin routes
        if (requiredRole === 'admin' && user) {
          await logSecurityEvent('ADMIN_ACCESS_GRANTED', user, {
            route: window.location.pathname
          });
        }
      }
    } catch (err: any) {
      console.error('Authorization check failed:', err);
      setError('Authorization check failed');
      setAuthorized(false);
      
      if (user) {
        await logSecurityEvent('AUTH_CHECK_ERROR', user, { error: err.message });
      }
    } finally {
      setChecking(false);
    }
  };

  return {
    user,
    loading: loading || checking,
    authorized,
    error,
    authResult
  };
};