// Production-specific security measures for mctlabs.tech

import { auth } from './firebase';
import { logSecurityEvent } from './security';

// Domain whitelist for production
const ALLOWED_DOMAINS = ['mctlabs.tech', 'www.mctlabs.tech'];
const ALLOWED_DEV_DOMAINS = ['localhost', '127.0.0.1', 'preview.mctlabs.tech'];

// Initialize production security
export const initializeProductionSecurity = () => {
  // Validate domain
  validateProductionDomain();
  
  // Set up security monitoring
  setupSecurityMonitoring();
  
  // Initialize threat detection
  initializeThreatDetection();
  
  // Set up CSP violation reporting
  setupCSPReporting();
};

// Validate that app is running on authorized domain
const validateProductionDomain = () => {
  const currentDomain = window.location.hostname;
  const isProduction = import.meta.env.PROD;
  
  if (isProduction && !ALLOWED_DOMAINS.includes(currentDomain)) {
    logSecurityEvent('UNAUTHORIZED_DOMAIN_ACCESS', null, {
      domain: currentDomain,
      expectedDomains: ALLOWED_DOMAINS
    });
    
    // Redirect to official domain
    window.location.href = 'https://mctlabs.tech';
    return;
  }
  
  if (!isProduction && !ALLOWED_DEV_DOMAINS.includes(currentDomain)) {
    console.warn('Development app running on unexpected domain:', currentDomain);
  }
};

// Set up comprehensive security monitoring
const setupSecurityMonitoring = () => {
  // Monitor for XSS attempts
  const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  if (originalInnerHTML) {
    Object.defineProperty(Element.prototype, 'innerHTML', {
      set: function(value) {
        if (typeof value === 'string' && value.includes('<script')) {
          logSecurityEvent('XSS_ATTEMPT_DETECTED', auth.currentUser, {
            content: value.substring(0, 100)
          });
          return;
        }
        originalInnerHTML.set?.call(this, value);
      },
      get: originalInnerHTML.get
    });
  }

  // Monitor for eval usage
  const originalEval = window.eval;
  window.eval = function(code: string) {
    logSecurityEvent('EVAL_USAGE_DETECTED', auth.currentUser, {
      code: code.substring(0, 100)
    });
    throw new Error('eval() is disabled for security reasons');
  };

  // Monitor for unauthorized localStorage access
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key: string, value: string) {
    if (key.includes('admin') || key.includes('token') || key.includes('secret')) {
      logSecurityEvent('SUSPICIOUS_LOCALSTORAGE_ACCESS', auth.currentUser, { key });
    }
    return originalSetItem.call(this, key, value);
  };
};

// Initialize threat detection systems
const initializeThreatDetection = () => {
  // Detect rapid-fire requests
  let requestCount = 0;
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    requestCount++;
    
    // Reset counter every minute
    setTimeout(() => { requestCount = Math.max(0, requestCount - 1); }, 60000);
    
    // Alert if too many requests
    if (requestCount > 50) {
      await logSecurityEvent('EXCESSIVE_API_REQUESTS', auth.currentUser, {
        requestCount,
        url: args[0]
      });
    }
    
    return originalFetch.apply(this, args);
  };

  // Detect developer tools usage in production
  if (import.meta.env.PROD) {
    let devtools = false;
    const threshold = 160;
    
    setInterval(() => {
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools) {
          devtools = true;
          logSecurityEvent('DEVELOPER_TOOLS_DETECTED', auth.currentUser);
        }
      } else {
        devtools = false;
      }
    }, 1000);
  }

  // Detect copy-paste of sensitive content
  document.addEventListener('paste', async (e) => {
    const pastedText = e.clipboardData?.getData('text') || '';
    if (pastedText.includes('admin') || pastedText.includes('password') || pastedText.includes('secret')) {
      await logSecurityEvent('SUSPICIOUS_PASTE_DETECTED', auth.currentUser, {
        contentLength: pastedText.length
      });
    }
  });
};

// Set up CSP violation reporting
const setupCSPReporting = () => {
  document.addEventListener('securitypolicyviolation', async (e) => {
    await logSecurityEvent('CSP_VIOLATION', auth.currentUser, {
      violatedDirective: e.violatedDirective,
      blockedURI: e.blockedURI,
      documentURI: e.documentURI,
      originalPolicy: e.originalPolicy
    });
  });
};

// Production-specific user validation
export const validateProductionUser = async (user: any): Promise<boolean> => {
  if (!user) return false;
  
  try {
    // Enhanced validation for production
    const checks = [
      user.emailVerified === true,
      user.email?.includes('@diu.edu.bd') || user.email === 'admin@mctlabs.tech',
      user.metadata?.creationTime !== undefined,
      user.uid?.length === 28 // Standard Firebase UID length
    ];
    
    const isValid = checks.every(check => check === true);
    
    if (!isValid) {
      await logSecurityEvent('INVALID_USER_VALIDATION', user, {
        checks: {
          emailVerified: user.emailVerified,
          validEmail: user.email?.includes('@diu.edu.bd') || user.email === 'admin@mctlabs.tech',
          hasCreationTime: user.metadata?.creationTime !== undefined,
          validUID: user.uid?.length === 28
        }
      });
    }
    
    return isValid;
  } catch (error) {
    await logSecurityEvent('USER_VALIDATION_ERROR', user, { error: error.message });
    return false;
  }
};

// Initialize all production security measures
if (import.meta.env.PROD) {
  initializeProductionSecurity();
}