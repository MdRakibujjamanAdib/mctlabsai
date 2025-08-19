import { rateLimiter, sanitizeInput, isValidUrl, logSecurityEvent, getSecureHeaders } from './security';
import { auth } from './firebase';

// Secure API request wrapper for Firebase
export const secureApiRequest = async (
  url: string,
  options: RequestInit = {},
  requireAuth: boolean = true
): Promise<Response> => {
  // Validate URL
  if (!isValidUrl(url)) {
    await logSecurityEvent('INVALID_URL_ATTEMPT', auth.currentUser, { url });
    throw new Error('Invalid or unsafe URL');
  }

  // Check authentication if required
  if (requireAuth && !auth.currentUser) {
    throw new Error('Authentication required');
  }

  // Rate limiting
  const identifier = auth.currentUser?.uid || 'anonymous';
  if (!rateLimiter.isAllowed(identifier)) {
    await logSecurityEvent('RATE_LIMIT_EXCEEDED', auth.currentUser, { url });
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  // Sanitize request body if present
  if (options.body && typeof options.body === 'string') {
    try {
      const bodyData = JSON.parse(options.body);
      const sanitizedBody = sanitizeRequestBody(bodyData);
      options.body = JSON.stringify(sanitizedBody);
    } catch (error) {
      // If not JSON, sanitize as string
      options.body = sanitizeInput(options.body);
    }
  }

  // Add security headers
  const secureHeaders = await getSecureHeaders(requireAuth);

  const secureOptions: RequestInit = {
    ...options,
    headers: {
      ...secureHeaders,
      ...options.headers
    },
    credentials: 'same-origin',
    mode: 'cors'
  };

  try {
    const response = await fetch(url, secureOptions);
    
    // Log suspicious responses
    if (!response.ok && response.status >= 400) {
      await logSecurityEvent('API_ERROR_RESPONSE', auth.currentUser, {
        url,
        status: response.status,
        statusText: response.statusText
      });
    }

    return response;
  } catch (error: any) {
    await logSecurityEvent('API_REQUEST_FAILED', auth.currentUser, {
      url,
      error: error.message
    });
    throw error;
  }
};

// Sanitize request body recursively
const sanitizeRequestBody = (obj: any): any => {
  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeRequestBody);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeInput(key)] = sanitizeRequestBody(value);
    }
    return sanitized;
  }
  
  return obj;
};

// Validate API responses
export const validateApiResponse = (response: any): boolean => {
  // Check for potential XSS in response
  if (typeof response === 'string') {
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(response));
  }
  
  return true;
};

// Secure file upload handler for Firebase Storage
export const secureFileUpload = async (
  file: File,
  path: string,
  maxSize: number = 5 * 1024 * 1024
): Promise<string> => {
  // Validate file
  if (file.size > maxSize) {
    throw new Error(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`);
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    await logSecurityEvent('INVALID_FILE_TYPE_UPLOAD', auth.currentUser, {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });
    throw new Error('Invalid file type. Only images are allowed.');
  }

  // Check file content (basic validation)
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // Basic file signature validation
  const isValidImage = validateImageSignature(uint8Array, file.type);
  if (!isValidImage) {
    await logSecurityEvent('INVALID_FILE_SIGNATURE', auth.currentUser, {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });
    throw new Error('Invalid file format detected');
  }

  // Upload to Firebase Storage
  const { storage } = await import('./firebase');
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  await logSecurityEvent('FILE_UPLOAD_SUCCESS', auth.currentUser, {
    fileName: file.name,
    fileSize: file.size,
    path
  });

  return downloadURL;
};

// Validate image file signatures
const validateImageSignature = (bytes: Uint8Array, mimeType: string): boolean => {
  const signatures: Record<string, number[][]> = {
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46]]
  };

  const expectedSignatures = signatures[mimeType];
  if (!expectedSignatures) return false;

  return expectedSignatures.some(signature =>
    signature.every((byte, index) => bytes[index] === byte)
  );
};

// Firebase-specific security helpers
export const validateFirebaseOperation = async (operation: string, data: any = {}) => {
  if (!auth.currentUser) {
    throw new Error('Authentication required for Firebase operation');
  }

  // Log Firebase operations for audit trail
  await logSecurityEvent('FIREBASE_OPERATION', auth.currentUser, {
    operation,
    dataKeys: Object.keys(data),
    timestamp: new Date().toISOString()
  });

  return true;
};