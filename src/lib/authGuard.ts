import { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { logSecurityEvent } from './security';

export interface AuthGuardResult {
  allowed: boolean;
  reason?: string;
  redirectTo?: string;
}

// Check if user has valid DIU email format
export const validateDIUEmail = (email: string): boolean => {
  const diuEmailRegex = /^.*-40-\d{3}@diu\.edu\.bd$/i;
  return diuEmailRegex.test(email);
};

// Check if user is verified student
export const isVerifiedStudent = async (user: User): Promise<boolean> => {
  if (!user.emailVerified) {
    await logSecurityEvent('UNVERIFIED_EMAIL_ACCESS_ATTEMPT', user);
    return false;
  }
  
  if (!validateDIUEmail(user.email || '')) {
    await logSecurityEvent('INVALID_EMAIL_FORMAT_ACCESS', user);
    return false;
  }
  
  try {
    const profileRef = doc(db, 'profiles', user.uid);
    const profileSnap = await getDoc(profileRef);
    
    if (!profileSnap.exists()) {
      await logSecurityEvent('MISSING_PROFILE_ACCESS_ATTEMPT', user);
      return false;
    }
    
    const profile = profileSnap.data();
    const isValidStudent = profile.department === 'MCT' && 
                          profile.university === 'Daffodil International University';
    
    if (!isValidStudent) {
      await logSecurityEvent('INVALID_STUDENT_CREDENTIALS', user, { profile });
    }
    
    return isValidStudent;
  } catch (error) {
    console.error('Error verifying student status:', error);
    await logSecurityEvent('STUDENT_VERIFICATION_ERROR', user, { error: error.message });
    return false;
  }
};

// Check if user is admin with enhanced security
export const isAdminUser = async (user: User): Promise<boolean> => {
  if (!user) return false;
  
  try {
    // First check: Email must be admin email
    if (user.email !== 'admin@mctlabs.tech') {
      if (user.email) {
        await logSecurityEvent('UNAUTHORIZED_ADMIN_EMAIL_ATTEMPT', user, { 
          attemptedEmail: user.email 
        });
      }
      return false;
    }

    // Second check: Email must be verified
    if (!user.emailVerified) {
      await logSecurityEvent('UNVERIFIED_ADMIN_EMAIL_ACCESS', user);
      return false;
    }

    // Third check: Get fresh token to check custom claims
    const idTokenResult = await user.getIdTokenResult();
    const hasAdminClaim = idTokenResult.claims.admin === true;
    
    if (!hasAdminClaim) {
      await logSecurityEvent('MISSING_ADMIN_CLAIM', user);
      return false;
    }

    // Fourth check: Verify profile in Firestore
    const profileRef = doc(db, 'profiles', user.uid);
    const profileSnap = await getDoc(profileRef);
    
    if (!profileSnap.exists()) {
      await logSecurityEvent('MISSING_ADMIN_PROFILE', user);
      return false;
    }
    
    const profile = profileSnap.data();
    
    // Final verification: All conditions must be met
    const hasAdminRole = profile.isAdmin === true;
    const isAuthorizedName = user.displayName === 'Administrator' || 
                            profile.full_name === 'Administrator';
    
    const finalAdminStatus = hasAdminRole && isAuthorizedName;
    
    if (!finalAdminStatus) {
      await logSecurityEvent('FAILED_ADMIN_VERIFICATION', user, {
        hasAdminRole,
        isAuthorizedName,
        profileData: profile
      });
    } else {
      await logSecurityEvent('SUCCESSFUL_ADMIN_VERIFICATION', user);
    }
    
    return finalAdminStatus;
  } catch (error) {
    console.error('Error checking admin status:', error);
    await logSecurityEvent('ADMIN_CHECK_ERROR', user, { error: error.message });
    return false;
  }
};

// Main auth guard function
export const authGuard = async (
  user: User | null, 
  requiredRole: 'student' | 'admin' | 'any' = 'student'
): Promise<AuthGuardResult> => {
  // Check if user is authenticated
  if (!user) {
    return {
      allowed: false,
      reason: 'Authentication required',
      redirectTo: '/login'
    };
  }

  // Check email verification for all roles except development
  if (!user.emailVerified && import.meta.env.PROD) {
    await logSecurityEvent('UNVERIFIED_EMAIL_ACCESS_ATTEMPT', user);
    return {
      allowed: false,
      reason: 'Email verification required',
      redirectTo: '/login'
    };
  }

  // Role-specific checks
  switch (requiredRole) {
    case 'admin':
      const adminAccess = await isAdminUser(user);
      if (!adminAccess) {
        return {
          allowed: false,
          reason: 'Admin access required',
          redirectTo: '/'
        };
      }
      break;
      
    case 'student':
      const studentAccess = await isVerifiedStudent(user);
      const adminAccess2 = await isAdminUser(user);
      
      if (!studentAccess && !adminAccess2) {
        return {
          allowed: false,
          reason: 'Verified DIU MCT student access required',
          redirectTo: '/login'
        };
      }
      break;
      
    case 'any':
      // Any authenticated user is allowed
      break;
  }

  return { allowed: true };
};

// Session security
export const validateSession = (user: User): boolean => {
  if (!user) return false;
  
  // Check if session is still valid
  const lastSignIn = user.metadata.lastSignInTime;
  if (!lastSignIn) return false;
  
  const sessionAge = Date.now() - new Date(lastSignIn).getTime();
  const maxSessionAge = parseInt(import.meta.env.VITE_SESSION_TIMEOUT || '86400000'); // 24 hours default
  
  if (sessionAge > maxSessionAge) {
    logSecurityEvent('SESSION_EXPIRED', user, { sessionAge, maxSessionAge });
    return false;
  }
  
  return true;
};

// Enhanced security monitoring
export const monitorSecurityThreats = (user: User | null) => {
  // Monitor for rapid API calls
  let apiCallCount = 0;
  const originalFetch = window.fetch;
  
  window.fetch = async (...args) => {
    apiCallCount++;
    
    // Reset counter every minute
    setTimeout(() => { apiCallCount = Math.max(0, apiCallCount - 1); }, 60000);
    
    // Alert if too many API calls
    if (apiCallCount > 100) {
      await logSecurityEvent('EXCESSIVE_API_CALLS', user, { callCount: apiCallCount });
    }
    
    return originalFetch(...args);
  };

  // Monitor for console access (potential debugging attempts)
  const originalLog = console.log;
  console.log = (...args) => {
    if (import.meta.env.PROD && args.some(arg => 
      typeof arg === 'string' && 
      (arg.includes('admin') || arg.includes('password') || arg.includes('token'))
    )) {
      logSecurityEvent('SUSPICIOUS_CONSOLE_ACCESS', user, { args });
    }
    originalLog(...args);
  };
};