import { db } from './firebase';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

export interface APIKey {
  id: string;
  service_name: string;
  display_name: string;
  api_key: string;
  description: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Default API key configurations
export const DEFAULT_API_SERVICES = [
  {
    service_name: 'openrouter_standard',
    display_name: 'OpenRouter - Standard Chat',
    description: 'OpenRouter API key for Standard chat mode (DeepSeek Chat v3)',
    api_key: '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'
  },
  {
    service_name: 'openrouter_beta',
    display_name: 'OpenRouter - Beta Chat',
    description: 'OpenRouter API key for Beta chat mode (Qwen 2.5 VL)',
    api_key: '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'
  },
  {
    service_name: 'openrouter_advanced',
    display_name: 'OpenRouter - Advanced Chat',
    description: 'OpenRouter API key for Advanced chat mode (DeepSeek R1 Distill)',
    api_key: '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'
  },
  {
    service_name: 'openrouter_coder',
    display_name: 'OpenRouter - Code Analysis',
    description: 'OpenRouter API key for Coder mode (Qwen 2.5 Coder)',
    api_key: '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'
  },
  {
    service_name: 'openrouter_echo',
    display_name: 'OpenRouter - Echo Personas',
    description: 'OpenRouter API key for Echo mode (Mistral 7B)',
    api_key: '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'
  },
  {
    service_name: 'elevenlabs',
    display_name: 'ElevenLabs',
    description: 'ElevenLabs API for text-to-speech and speech-to-text',
    api_key: 'sk_f8b2c4e5d9a1b3c7e6f0a2d8c5b9e3f7a1d4c8b6e2f5a9c3d7b0e4f8a2c6d9b3'
  },
  {
    service_name: 'minimaxi',
    display_name: 'MiniMaxi',
    description: 'MiniMaxi API for video/animation generation',
    api_key: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJHcm91cE5hbWUiOiJtY3RsYWJzIiwiVXNlck5hbWUiOiJhZGliIiwiQWNjb3VudCI6IiIsIlN1YmplY3RJRCI6IjE3MzY5NTI4NzE5NzQ5NzE0NzAiLCJQaG9uZSI6IjAxNzEyMzQ1Njc4IiwiR3JvdXBJZCI6IjE3MzY5NTI4NzE5NzQ5NzE0NzAiLCJQYWdlTmFtZSI6IiIsIk1haWwiOiJhZGliQGRpdS5lZHUuYmQiLCJDcmVhdGVUaW1lIjoiMjAyNS0wMS0xNSAxNDo0NzoxNSIsImlzcyI6Im1pbmltYXgiLCJleHAiOjE3Njg0ODg0MzUsImlhdCI6MTczNjk1MjQzNX0'
  },
  {
    service_name: 'xet_standard',
    display_name: 'XET Standard',
    description: 'XET API for standard image generation',
    api_key: 'daffodil_uni!'
  },
  {
    service_name: 'xet_flash',
    display_name: 'XET Flash',
    description: 'XET API for flash image generation',
    api_key: 'daffodil_uni!'
  }
];

// Initialize default API keys
export const initializeAPIKeys = async () => {
  try {
    const apiKeysCollection = collection(db, 'api_keys');
    const existingKeys = await getDocs(apiKeysCollection);
    
    if (existingKeys.empty) {
      for (const service of DEFAULT_API_SERVICES) {
        const keyRef = doc(apiKeysCollection);
        await setDoc(keyRef, {
          ...service,
          id: keyRef.id,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
      console.log('Default API keys initialized successfully');
    }
  } catch (error) {
    console.error('Error initializing API keys:', error);
  }
};

// Get all API keys
export const getAPIKeys = async (): Promise<APIKey[]> => {
  try {
    const apiKeysCollection = collection(db, 'api_keys');
    const snapshot = await getDocs(apiKeysCollection);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at.toDate(),
      updated_at: doc.data().updated_at.toDate()
    })) as APIKey[];
  } catch (error) {
    console.error('Error fetching API keys:', error);
    throw error;
  }
};

// Get specific API key by service name
export const getAPIKey = async (serviceName: string): Promise<string | null> => {
  try {
    // Map service names to actual service names in database
    const serviceMapping: Record<string, string> = {
      'openrouter': 'openrouter_standard',
      'openrouter_standard': 'openrouter_standard',
      'openrouter_beta': 'openrouter_beta', 
      'openrouter_advanced': 'openrouter_advanced',
      'openrouter_coder': 'openrouter_coder',
      'openrouter_echo': 'openrouter_echo',
      'elevenlabs': 'elevenlabs',
      'minimaxi': 'minimaxi',
      'xet_standard': 'xet_standard',
      'xet_flash': 'xet_flash'
    };
    
    const actualServiceName = serviceMapping[serviceName] || serviceName;
    
    const apiKeysCollection = collection(db, 'api_keys');
    const q = query(apiKeysCollection, where('service_name', '==', actualServiceName), where('is_active', '==', true));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const keyData = snapshot.docs[0].data();
      return keyData.api_key || null;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching API key for ${serviceName}:`, error);
    return null;
  }
};

// Save or update API key
export const saveAPIKey = async (apiKey: Omit<APIKey, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
  try {
    const apiKeysCollection = collection(db, 'api_keys');
    
    // Check if key already exists
    const q = query(apiKeysCollection, where('service_name', '==', apiKey.service_name));
    const existingSnapshot = await getDocs(q);
    
    if (!existingSnapshot.empty) {
      // Update existing key
      const existingDoc = existingSnapshot.docs[0];
      await updateDoc(doc(apiKeysCollection, existingDoc.id), {
        ...apiKey,
        updated_at: new Date()
      });
      return existingDoc.id;
    } else {
      // Create new key
      const keyRef = doc(apiKeysCollection);
      await setDoc(keyRef, {
        ...apiKey,
        id: keyRef.id,
        created_at: new Date(),
        updated_at: new Date()
      });
      return keyRef.id;
    }
  } catch (error) {
    console.error('Error saving API key:', error);
    throw error;
  }
};

// Update API key
export const updateAPIKey = async (id: string, updates: Partial<APIKey>): Promise<void> => {
  try {
    const keyRef = doc(db, 'api_keys', id);
    await updateDoc(keyRef, {
      ...updates,
      updated_at: new Date()
    });
  } catch (error) {
    console.error('Error updating API key:', error);
    throw error;
  }
};

// Delete API key
export const deleteAPIKey = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'api_keys', id));
  } catch (error) {
    console.error('Error deleting API key:', error);
    throw error;
  }
};

// Toggle API key active status
export const toggleAPIKeyStatus = async (id: string, isActive: boolean): Promise<void> => {
  try {
    await updateAPIKey(id, { is_active: isActive });
  } catch (error) {
    console.error('Error toggling API key status:', error);
    throw error;
  }
};