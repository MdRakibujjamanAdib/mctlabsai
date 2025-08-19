// Enhanced Firestore Security Rules for Production
export const ENHANCED_FIRESTORE_RULES = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions for security
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/profiles/$(request.auth.uid)) &&
             get(/databases/$(database)/documents/profiles/$(request.auth.uid)).data.isAdmin == true;
    }
    
    function isValidDIUEmail() {
      return isAuthenticated() && 
             request.auth.token.email.matches('.*-40-[0-9]{3}@diu\\.edu\\.bd');
    }
    
    function isEmailVerified() {
      return isAuthenticated() && request.auth.token.email_verified == true;
    }
    
    function isValidDataSize(data) {
      return data.size() <= 1000000; // 1MB limit for document size
    }
    
    function hasValidTimestamp(data) {
      return data.keys().hasAll(['created_at', 'updated_at']) &&
             data.created_at is timestamp &&
             data.updated_at is timestamp;
    }

    // Profiles - Enhanced security
    match /profiles/{userId} {
      allow read: if isAuthenticated() && (
        isOwner(userId) || 
        isAdmin()
      );
      
      allow create: if isAuthenticated() && 
                       isOwner(userId) && 
                       isEmailVerified() &&
                       isValidDIUEmail() &&
                       isValidDataSize(request.resource.data) &&
                       hasValidTimestamp(request.resource.data);
      
      allow update: if isAuthenticated() && (
        (isOwner(userId) && !('isAdmin' in request.resource.data.diff(resource.data).affectedKeys())) ||
        isAdmin()
      ) && isValidDataSize(request.resource.data);
      
      allow delete: if isAdmin();
    }

    // Chat messages - Strict user isolation
    match /chat_messages/{messageId} {
      allow read, write: if isAuthenticated() && 
                           isEmailVerified() &&
                           isOwner(resource.data.user_id) &&
                           isValidDataSize(request.resource.data);
      
      allow create: if isAuthenticated() && 
                      isEmailVerified() &&
                      isOwner(request.resource.data.user_id) &&
                      isValidDataSize(request.resource.data) &&
                      hasValidTimestamp(request.resource.data);
    }

    // Chat conversations - User isolation
    match /chat_conversations/{conversationId} {
      allow read, write: if isAuthenticated() && 
                           isEmailVerified() &&
                           isOwner(resource.data.user_id) &&
                           isValidDataSize(request.resource.data);
      
      allow create: if isAuthenticated() && 
                      isEmailVerified() &&
                      isOwner(request.resource.data.user_id) &&
                      isValidDataSize(request.resource.data) &&
                      hasValidTimestamp(request.resource.data);
    }

    // History items - User isolation
    match /history_items/{historyId} {
      allow read, write: if isAuthenticated() && 
                           isEmailVerified() &&
                           isOwner(resource.data.user_id) &&
                           isValidDataSize(request.resource.data);
      
      allow create: if isAuthenticated() && 
                      isEmailVerified() &&
                      isOwner(request.resource.data.user_id) &&
                      isValidDataSize(request.resource.data);
    }

    // Echo personas - User isolation
    match /echo_personas/{personaId} {
      allow read, write: if isAuthenticated() && 
                           isEmailVerified() &&
                           isOwner(resource.data.user_id) &&
                           isValidDataSize(request.resource.data);
      
      allow create: if isAuthenticated() && 
                      isEmailVerified() &&
                      isOwner(request.resource.data.user_id) &&
                      isValidDataSize(request.resource.data);
    }

    // API Keys - Admin only with strict validation
    match /api_keys/{keyId} {
      allow read: if isAuthenticated() && isEmailVerified();
      allow write: if isAdmin() && 
                     isValidDataSize(request.resource.data) &&
                     hasValidTimestamp(request.resource.data);
    }

    // AI Agents - Admin only
    match /ai_agents/{agentId} {
      allow read: if isAuthenticated() && isEmailVerified();
      allow write: if isAdmin() && isValidDataSize(request.resource.data);
    }

    // AI Context Entries - Admin only
    match /ai_context_entries/{entryId} {
      allow read: if isAuthenticated() && isEmailVerified();
      allow write: if isAdmin() && isValidDataSize(request.resource.data);
    }

    // Published apps - Public read, authenticated create
    match /published_apps/{appId} {
      allow read: if true; // Public read access
      allow create: if isAuthenticated() && 
                      isEmailVerified() &&
                      isValidDataSize(request.resource.data) &&
                      hasValidTimestamp(request.resource.data);
      allow update, delete: if false; // Prevent modifications after publishing
    }

    // User subscriptions - User and admin access
    match /userSubscriptions/{userId} {
      allow read: if isAuthenticated() && (isOwner(userId) || isAdmin());
      allow write: if isAdmin() && isValidDataSize(request.resource.data);
    }

    // Plans - Public read, admin write
    match /plans/{planId} {
      allow read: if isAuthenticated() && isEmailVerified();
      allow write: if isAdmin() && isValidDataSize(request.resource.data);
    }

    // Security logs - Admin only
    match /security_logs/{logId} {
      allow read, write: if isAdmin() && isValidDataSize(request.resource.data);
    }

    // User management logs - Admin only
    match /user_management_logs/{logId} {
      allow read, write: if isAdmin() && isValidDataSize(request.resource.data);
    }

    // Default deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
`;

// Firebase Storage Security Rules
export const ENHANCED_STORAGE_RULES = `
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Avatar uploads - User specific with size and type validation
    match /avatars/{userId}/{fileName} {
      allow read: if true; // Public read for avatars
      allow write: if request.auth != null &&
                     request.auth.uid == userId &&
                     request.auth.token.email_verified == true &&
                     resource.size < 5 * 1024 * 1024 && // 5MB limit
                     resource.contentType.matches('image/.*') &&
                     fileName.matches('.*\\.(jpg|jpeg|png|gif|webp)$');
    }
    
    // Temporary uploads - Authenticated users only
    match /temp/{userId}/{fileName} {
      allow read, write: if request.auth != null &&
                           request.auth.uid == userId &&
                           request.auth.token.email_verified == true &&
                           resource.size < 10 * 1024 * 1024; // 10MB limit for temp files
    }
    
    // Default deny
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
`;