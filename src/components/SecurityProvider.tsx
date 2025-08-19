import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { checkSessionTimeout, logSecurityEvent, updateLastActivity } from '../lib/security';
import { monitorSecurityThreats } from '../lib/authGuard';

interface SecurityContextType {
  sessionValid: boolean;
  lastActivity: number;
  securityLevel: 'low' | 'medium' | 'high';
  threatLevel: 'normal' | 'elevated' | 'high';
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const [sessionValid, setSessionValid] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [securityLevel, setSecurityLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [threatLevel, setThreatLevel] = useState<'normal' | 'elevated' | 'high'>('normal');

  useEffect(() => {
    // Initialize security monitoring
    const initSecurity = async () => {
      if (user) {
        await logSecurityEvent('SECURITY_PROVIDER_INITIALIZED', user);
        updateLastActivity();
        setLastActivity(Date.now());
        
        // Start security monitoring
        monitorSecurityThreats(user);
      }
    };

    initSecurity();

    // Set up activity monitoring
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const handleActivity = () => {
      updateLastActivity();
      setLastActivity(Date.now());
      setSessionValid(true);
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Session timeout check
    const sessionCheck = setInterval(async () => {
      if (user && checkSessionTimeout()) {
        await logSecurityEvent('SESSION_TIMEOUT_FORCED_LOGOUT', user);
        setSessionValid(false);
        signOut();
      }
    }, 60000); // Check every minute

    // Security level assessment
    const assessSecurityLevel = () => {
      const isHTTPS = window.location.protocol === 'https:';
      const isProduction = import.meta.env.PROD;
      const hasValidDomain = window.location.hostname === 'mctlabs.tech' || 
                            window.location.hostname === 'localhost';

      if (isHTTPS && isProduction && hasValidDomain) {
        setSecurityLevel('high');
      } else if (isHTTPS || isProduction) {
        setSecurityLevel('medium');
      } else {
        setSecurityLevel('low');
      }
    };

    assessSecurityLevel();

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearInterval(sessionCheck);
    };
  }, [user, signOut]);

  // Monitor for suspicious activity patterns
  useEffect(() => {
    let suspiciousActivityCount = 0;
    let devToolsInterval: NodeJS.Timeout | null = null;
    
    const monitorActivity = async () => {
      // Monitor for rapid page changes (potential bot behavior)
      let pageChangeCount = 0;
      const resetCount = () => { pageChangeCount = 0; };
      const countTimeout = setTimeout(resetCount, 10000); // Reset every 10 seconds

      const handlePageChange = async () => {
        pageChangeCount++;
        if (pageChangeCount > 20 && user) { // More than 20 page changes in 10 seconds
          suspiciousActivityCount++;
          setThreatLevel(suspiciousActivityCount > 3 ? 'high' : 'elevated');
          
          await logSecurityEvent('SUSPICIOUS_RAPID_NAVIGATION', user, {
            pageChangeCount,
            timeWindow: '10s',
            suspiciousActivityCount
          });
        }
      };

      // Monitor for developer tools usage
      const detectDevTools = () => {
        const threshold = 160;
        devToolsInterval = setInterval(() => {
          if (window.outerHeight - window.innerHeight > threshold || 
              window.outerWidth - window.innerWidth > threshold) {
            if (import.meta.env.PROD && user) {
              logSecurityEvent('DEVELOPER_TOOLS_DETECTED', user);
            }
          }
        }, 1000);
      };

      window.addEventListener('popstate', handlePageChange);
      detectDevTools();
      
      return () => {
        window.removeEventListener('popstate', handlePageChange);
        clearTimeout(countTimeout);
        if (devToolsInterval) {
          clearInterval(devToolsInterval);
        }
      };
    };

    monitorActivity().then(cleanup => {
      return cleanup;
    });

    return () => {
      if (devToolsInterval) {
        clearInterval(devToolsInterval);
      }
    };
  }, [user]);

  return (
    <SecurityContext.Provider value={{
      sessionValid,
      lastActivity,
      securityLevel,
      threatLevel
    }}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}