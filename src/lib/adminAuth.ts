import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, updateDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  password: string;
  isActive: boolean;
  permissions: {
    manageUsers: boolean;
    manageContext: boolean;
    viewAnalytics: boolean;
    systemSettings: boolean;
  };
  createdAt: Date;
  lastLogin?: Date;
}

export interface AIContext {
  id: string;
  contextKey: string;
  contextValue: string;
  category: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserManagementLog {
  id: string;
  adminId: string;
  adminUsername: string;
  action: string;
  targetUserId: string;
  targetUserEmail: string;
  details: string;
  timestamp: Date;
}

// Initialize default admin user
export const initializeDefaultAdmin = async () => {
  try {
    // Check if admin already exists
    const adminQuery = query(
      collection(db, 'admin_users'),
      where('username', '==', 'Adib')
    );
    const adminSnapshot = await getDocs(adminQuery);
    
    if (adminSnapshot.empty) {
      // Create default admin user
      const adminData: Omit<AdminUser, 'id'> = {
        username: 'Adib',
        email: 'adib@mctlabs.admin',
        password: 'admin123',
        isActive: true,
        permissions: {
          manageUsers: true,
          manageContext: true,
          viewAnalytics: true,
          systemSettings: true
        },
        createdAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'admin_users'), adminData);
      console.log('Default admin user created with ID:', docRef.id);
    }
  } catch (error) {
    console.error('Error initializing default admin:', error);
  }
};

// Admin authentication
export const adminSignIn = async (username: string, password: string): Promise<AdminUser> => {
  try {
    // Check credentials against admin_users collection
    const adminQuery = query(
      collection(db, 'admin_users'),
      where('username', '==', username),
      where('isActive', '==', true)
    );
    const adminSnapshot = await getDocs(adminQuery);
    
    if (adminSnapshot.empty) {
      throw new Error('Invalid admin credentials');
    }

    const adminDoc = adminSnapshot.docs[0];
    const adminData = adminDoc.data() as Omit<AdminUser, 'id'>;

    // Simple password check (in production, use proper hashing)
    if (password !== adminData.password) {
      throw new Error('Invalid admin credentials');
    }

    // Update last login
    await updateDoc(doc(db, 'admin_users', adminDoc.id), {
      lastLogin: new Date()
    });

    return {
      id: adminDoc.id,
      ...adminData,
      createdAt: adminData.createdAt instanceof Date ? adminData.createdAt : new Date(adminData.createdAt),
      lastLogin: new Date()
    };
  } catch (error) {
    console.error('Admin sign in error:', error);
    throw error;
  }
};

// Get all admin users
export const getAdminUsers = async (): Promise<AdminUser[]> => {
  try {
    const adminSnapshot = await getDocs(collection(db, 'admin_users'));
    return adminSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      lastLogin: doc.data().lastLogin?.toDate()
    })) as AdminUser[];
  } catch (error) {
    console.error('Error getting admin users:', error);
    throw error;
  }
};

// AI Context Database Functions
export const getAIContexts = async (): Promise<AIContext[]> => {
  try {
    const contextsSnapshot = await getDocs(
      query(collection(db, 'ai_context_database'), where('isActive', '==', true))
    );
    return contextsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    })) as AIContext[];
  } catch (error) {
    console.error('Error getting AI contexts:', error);
    throw error;
  }
};

export const saveAIContext = async (context: Omit<AIContext, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'ai_context_database'), {
      ...context,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving AI context:', error);
    throw error;
  }
};

export const updateAIContext = async (id: string, updates: Partial<AIContext>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'ai_context_database', id), {
      ...updates,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating AI context:', error);
    throw error;
  }
};

export const deleteAIContext = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'ai_context_database', id));
  } catch (error) {
    console.error('Error deleting AI context:', error);
    throw error;
  }
};

// User Management Functions
export const getAllUsers = async () => {
  try {
    const usersSnapshot = await getDocs(collection(db, 'profiles'));
    return usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().created_at
    }));
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
};

export const updateUserRole = async (userId: string, isAdmin: boolean, adminId: string, adminUsername: string): Promise<void> => {
  try {
    // Update user profile
    await updateDoc(doc(db, 'profiles', userId), {
      isAdmin: isAdmin,
      updated_at: new Date().toISOString()
    });

    // Log the action
    await addDoc(collection(db, 'user_management_logs'), {
      adminId,
      adminUsername,
      action: isAdmin ? 'GRANT_ADMIN' : 'REVOKE_ADMIN',
      targetUserId: userId,
      targetUserEmail: '', // Will be filled from user data
      details: `User ${isAdmin ? 'granted' : 'revoked'} admin privileges`,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

export const toggleUserAccess = async (userId: string, isActive: boolean, adminId: string, adminUsername: string): Promise<void> => {
  try {
    // Update user profile
    await updateDoc(doc(db, 'profiles', userId), {
      isActive: isActive,
      updated_at: new Date().toISOString()
    });

    // Log the action
    await addDoc(collection(db, 'user_management_logs'), {
      adminId,
      adminUsername,
      action: isActive ? 'ENABLE_USER' : 'DISABLE_USER',
      targetUserId: userId,
      targetUserEmail: '', // Will be filled from user data
      details: `User access ${isActive ? 'enabled' : 'disabled'}`,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error toggling user access:', error);
    throw error;
  }
};

export const getUserManagementLogs = async (): Promise<UserManagementLog[]> => {
  try {
    const logsSnapshot = await getDocs(
      query(
        collection(db, 'user_management_logs'),
        orderBy('timestamp', 'desc')
      )
    );
    return logsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate()
    })) as UserManagementLog[];
  } catch (error) {
    console.error('Error getting user management logs:', error);
    throw error;
  }
};

// Generate AI system prompt from context database
export const generateAISystemPrompt = async (): Promise<string> => {
  try {
    const contexts = await getAIContexts();
    
    const basePrompt = `You are MCT Labs AI, a next-generation departmental AI assistant developed by Md Rakibujjaman Adib for the Department of Multimedia and Creative Technology (MCT), Daffodil International University.

Your primary role is to act as a virtual university professor with comprehensive knowledge about the MCT department, its students, faculty, and activities.

IMPORTANT CONTEXT DATABASE:
The following information has been provided by the admin and should be treated as factual knowledge:

`;

    const contextByCategory = contexts.reduce((acc, context) => {
      if (!acc[context.category]) {
        acc[context.category] = [];
      }
      acc[context.category].push(context.contextValue);
      return acc;
    }, {} as Record<string, string[]>);

    let contextPrompt = basePrompt;
    
    Object.entries(contextByCategory).forEach(([category, values]) => {
      contextPrompt += `\n${category.toUpperCase()}:\n`;
      values.forEach(value => {
        contextPrompt += `- ${value}\n`;
      });
    });

    contextPrompt += `\n
Your tone and personality:
- Speak with the authority of a professor but maintain a friendly and approachable vibe
- Add a touch of light humor to keep learning fun, but always stay respectful and professional
- Be student-first: patient, encouraging, and motivating
- When needed, highlight real-world applications of knowledge to make learning practical

Always use the context database information when relevant to provide accurate, personalized responses about students, faculty, courses, and department activities.`;

    return contextPrompt;
  } catch (error) {
    console.error('Error generating AI system prompt:', error);
    return 'You are MCT Labs AI, a helpful assistant for the MCT department.';
  }
};