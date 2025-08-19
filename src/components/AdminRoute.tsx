import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Shield, AlertCircle, Lock } from 'lucide-react';
import { verifyAdminAccess, logSecurityEvent } from '../lib/security';

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);

  useEffect(() => {
    verifyAdminAccessWithSecurity();
  }, [user]);

  const verifyAdminAccessWithSecurity = async () => {
    if (!user) {
      setIsAdmin(false);
      setVerifying(false);
      return;
    }

    try {
      setVerifying(true);
      setError(null);
      setSecurityAlert(null);

      // Enhanced admin verification
      const adminAccess = await verifyAdminAccess(user);
      
      if (!adminAccess) {
        // Log unauthorized access attempt with detailed info
        await logSecurityEvent('UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT', user, {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          attemptedRoute: window.location.pathname,
          referrer: document.referrer
        });
        
        setSecurityAlert('Unauthorized access attempt has been logged and reported.');
        setError('Access denied: Admin privileges required');
        setIsAdmin(false);
        return;
      }

      // Log successful admin access
      await logSecurityEvent('ADMIN_ACCESS_GRANTED', user, {
        route: window.location.pathname
      });
      
      setIsAdmin(true);
    } catch (err: any) {
      console.error('Error verifying admin access:', err);
      await logSecurityEvent('ADMIN_VERIFICATION_ERROR', user, { 
        error: err.message,
        stack: err.stack 
      });
      setError('Failed to verify admin permissions');
      setIsAdmin(false);
    } finally {
      setVerifying(false);
    }
  };

  // Show loading state while verifying
  if (loading || verifying) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Verifying admin access...</p>
          <p className="text-gray-400 text-sm mt-2">Performing security checks...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/loginasadib" replace />;
  }

  // Show enhanced security error if verification failed
  if (error || isAdmin === false) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-red-900/50 border border-red-700 rounded-xl p-8 max-w-md w-full text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <Shield className="w-16 h-16 text-red-400" />
              <Lock className="w-6 h-6 text-red-500 absolute -bottom-1 -right-1" />
            </div>
          </div>
          
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-red-200 mb-4">
            {error || 'You do not have permission to access the admin panel.'}
          </p>
          
          {securityAlert && (
            <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg p-3 mb-4">
              <p className="text-yellow-200 text-sm">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                {securityAlert}
              </p>
            </div>
          )}
          
          <div className="space-y-3">
            <p className="text-sm text-gray-400">
              This incident has been logged for security purposes.
            </p>
            <p className="text-xs text-gray-500">
              Timestamp: {new Date().toISOString()}
            </p>
            <p className="text-xs text-gray-500">
              User ID: {user.uid}
            </p>
          </div>
          
          <button
            onClick={() => window.location.href = '/'}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Render admin content if verification passed
  return <>{children}</>;
}