import { auth } from './firebase';
import { User } from 'firebase/auth';

// Environment validation
export const validateEnvironment = () => {
  // In production, Firebase config is embedded, so skip env var validation
  if (import.meta.env.PROD) {
    return;
  }
  
  // Only validate in development
  const requiredEnvVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID'
  ];

  const missing = requiredEnvVars.filter(envVar => !import.meta.env[envVar]);
  
  if (missing.length > 0) {
    console.warn('Missing environment variables (using fallback values):', missing);
  }

  // Validate production domain
  if (import.meta.env.PROD && window.location.hostname !== 'mctlabs.tech') {
    console.warn('Application running on unauthorized domain:', window.location.hostname);
  }
};

// Rate limiting for API calls
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    return true;
  }

  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

export const rateLimiter = new RateLimiter();

// Input sanitization
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .slice(0, 10000); // Limit length
};

// Validate file uploads
export const validateFileUpload = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 5MB' };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, GIF, and WebP images are allowed' };
  }
  
  return { valid: true };
};

// Admin role verification with Firebase
export const isAdmin = async (user: User | null): Promise<boolean> => {
  if (!user) return false;
  
  try {
    // Get fresh token to check custom claims
    const idTokenResult = await user.getIdTokenResult();
    
    // Check custom claims for admin role
    const isAdminClaim = idTokenResult.claims.admin === true;
    
    // Additional verification for specific admin email
    const isAuthorizedEmail = user.email === 'admin@mctlabs.tech';
    
    // Both conditions must be met
    return isAdminClaim && isAuthorizedEmail;
  } catch (error) {
    console.error('Error verifying admin status:', error);
    return false;
  }
};

// Secure admin authentication
export const verifyAdminAccess = async (user: User | null): Promise<boolean> => {
  if (!user) return false;
  
  try {
    // Verify email is verified
    if (!user.emailVerified) {
      await logSecurityEvent('ADMIN_ACCESS_UNVERIFIED_EMAIL', user);
      return false;
    }

    // Check admin status
    const adminStatus = await isAdmin(user);
    
    if (!adminStatus) {
      await logSecurityEvent('UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT', user);
    }
    
    return adminStatus;
  } catch (error) {
    console.error('Error verifying admin access:', error);
    await logSecurityEvent('ADMIN_VERIFICATION_ERROR', user, { error: error.message });
    return false;
  }
};

// Content Security Policy helpers
export const generateNonce = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Secure headers for API requests
export const getSecureHeaders = async (includeAuth: boolean = true): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Client-Version': '1.0.0',
    'X-Domain': 'mctlabs.tech',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };

  if (includeAuth && auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
  }

  return headers;
};

// Validate URLs to prevent SSRF attacks
export const isValidUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    
    // Only allow HTTPS in production
    if (import.meta.env.PROD && parsedUrl.protocol !== 'https:') {
      return false;
    }
    
    // Block private IP ranges
    const hostname = parsedUrl.hostname;
    const privateRanges = [
      /^127\./, // 127.0.0.0/8
      /^10\./, // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
      /^192\.168\./, // 192.168.0.0/16
      /^localhost$/i,
      /^0\.0\.0\.0$/
    ];
    
    return !privateRanges.some(range => range.test(hostname));
  } catch {
    return false;
  }
};

// Audit logging with Firebase
export const logSecurityEvent = async (event: string, user: User | null, details: any = {}) => {
  try {
    const logData = {
      event_type: event,
      user_id: user?.uid || null,
      user_email: user?.email || null,
      ip_address: await getUserIP(),
      user_agent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      severity: getSeverityLevel(event),
      ...details
    };

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log(`[SECURITY] ${event}:`, logData);
    }

    // In production, you could send to Firebase Functions for server-side logging
    if (import.meta.env.PROD && import.meta.env.VITE_ENABLE_SECURITY_LOGGING === 'true') {
      // Store in Firestore security_logs collection
      const { db } = await import('./firebase');
      const { collection, addDoc } = await import('firebase/firestore');
      
      await addDoc(collection(db, 'security_logs'), logData);
    }
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

// Get user IP address (best effort)
const getUserIP = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || 'unknown';
  } catch {
    return 'unknown';
  }
};

// Determine severity level based on event type
const getSeverityLevel = (event: string): string => {
  const criticalEvents = ['UNAUTHORIZED_ADMIN_ACCESS', 'SUSPICIOUS_ACTIVITY', 'SECURITY_BREACH'];
  const warningEvents = ['FAILED_LOGIN_ATTEMPT', 'RATE_LIMIT_EXCEEDED', 'INVALID_FILE_UPLOAD'];
  
  if (criticalEvents.some(e => event.includes(e))) return 'critical';
  if (warningEvents.some(e => event.includes(e))) return 'warning';
  return 'info';
};

// Session timeout management
export const SESSION_TIMEOUT = parseInt(import.meta.env.VITE_SESSION_TIMEOUT || '86400000'); // 24 hours default

export const checkSessionTimeout = (): boolean => {
  const lastActivity = localStorage.getItem('lastActivity');
  if (!lastActivity) return false;
  
  const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
  return timeSinceLastActivity > SESSION_TIMEOUT;
};

export const updateLastActivity = (): void => {
  localStorage.setItem('lastActivity', Date.now().toString());
};

// Domain validation
export const validateDomain = (): boolean => {
  const allowedDomains = ['mctlabs.tech', 'localhost', '127.0.0.1'];
  const currentDomain = window.location.hostname;
  
  if (import.meta.env.PROD && !allowedDomains.includes(currentDomain)) {
    logSecurityEvent('UNAUTHORIZED_DOMAIN_ACCESS', null, { domain: currentDomain });
    return false;
  }
  
  return true;
};

// Initialize security measures
export const initializeSecurity = () => {
  validateEnvironment();
  
  if (!validateDomain()) {
    throw new Error('Unauthorized domain access detected');
  }
  
  // Update activity on user interactions
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
  events.forEach(event => {
    document.addEventListener(event, updateLastActivity, { passive: true });
  });
  
  // Check session timeout periodically
  setInterval(() => {
    if (checkSessionTimeout() && auth.currentUser) {
      logSecurityEvent('SESSION_TIMEOUT', auth.currentUser);
      auth.signOut();
    }
  }, 60000); // Check every minute

  // Monitor for suspicious activity
  monitorSuspiciousActivity();
};

// Monitor for suspicious activity patterns
const monitorSuspiciousActivity = () => {
  let rapidClickCount = 0;
  let lastClickTime = 0;
  
  document.addEventListener('click', async () => {
    const now = Date.now();
    if (now - lastClickTime < 100) { // Clicks faster than 100ms
      rapidClickCount++;
      if (rapidClickCount > 10) {
        await logSecurityEvent('SUSPICIOUS_RAPID_CLICKING', auth.currentUser, {
          clickCount: rapidClickCount,
          timeWindow: '1s'
        });
        rapidClickCount = 0;
      }
    } else {
      rapidClickCount = 0;
    }
    lastClickTime = now;
  });
};