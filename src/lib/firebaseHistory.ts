import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';

export interface HistoryItem {
  id?: string;
  user_id: string;
  type: 'image' | 'animation' | 'chat' | 'speech-to-text' | '3d_model' | 'echo';
  content: string;
  metadata?: {
    image_url?: string;
    video_url?: string;
    model_url?: string;
    voice_id?: string;
    voice_gender?: string;
    mode?: string;
    [key: string]: any;
  };
  created_at: Date;
}

export interface ChatConversation {
  id?: string;
  user_id: string;
  title: string;
  last_message: string;
  created_at: Date;
  updated_at: Date;
}

export interface ChatMessage {
  id?: string;
  user_id: string;
  conversation_id?: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'general' | 'coder' | 'image' | 'speech-to-text' | '3d_model' | 'echo';
  image_url?: string;
  video_url?: string;
  model_url?: string;
  prompt?: string;
  created_at: Date;
  updated_at: Date;
}

export interface TunerHistory {
  id?: string;
  user_id: string;
  content: string;
  voice_id: string;
  voice_gender?: string;
  created_at: Date;
}

export interface EchoPersona {
  id?: string;
  user_id: string;
  name: string;
  description?: string;
  prompt: string;
  created_at: Date;
}

// History Items Functions
export const saveHistoryItem = async (historyItem: Omit<HistoryItem, 'id' | 'created_at'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'history_items'), {
      ...historyItem,
      created_at: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving history item:', error);
    throw error;
  }
};

export const getHistoryItems = async (userId: string, type: string, limit: number = 20): Promise<HistoryItem[]> => {
  try {
    const q = query(
      collection(db, 'history_items'),
      where('user_id', '==', userId),
      where('type', '==', type),
      orderBy('created_at', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at.toDate()
    })) as HistoryItem[];
  } catch (error) {
    console.error('Error getting history items:', error);
    throw error;
  }
};

export const deleteHistoryItem = async (historyId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'history_items', historyId));
  } catch (error) {
    console.error('Error deleting history item:', error);
    throw error;
  }
};

// Chat Conversations Functions
export const createChatConversation = async (conversation: Omit<ChatConversation, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
  try {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, 'chat_conversations'), {
      ...conversation,
      created_at: now,
      updated_at: now
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating chat conversation:', error);
    throw error;
  }
};

export const getChatConversations = async (userId: string): Promise<ChatConversation[]> => {
  try {
    const q = query(
      collection(db, 'chat_conversations'),
      where('user_id', '==', userId),
      orderBy('updated_at', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at.toDate(),
      updated_at: doc.data().updated_at.toDate()
    })) as ChatConversation[];
  } catch (error) {
    console.error('Error getting chat conversations:', error);
    throw error;
  }
};

export const updateChatConversation = async (conversationId: string, updates: Partial<ChatConversation>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'chat_conversations', conversationId), {
      ...updates,
      updated_at: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating chat conversation:', error);
    throw error;
  }
};

export const deleteChatConversation = async (conversationId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'chat_conversations', conversationId));
  } catch (error) {
    console.error('Error deleting chat conversation:', error);
    throw error;
  }
};

// Chat Messages Functions
export const saveChatMessage = async (message: Omit<ChatMessage, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
  try {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, 'chat_messages'), {
      ...message,
      created_at: now,
      updated_at: now
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving chat message:', error);
    throw error;
  }
};

export const getChatMessages = async (userId: string, conversationId?: string, type?: string): Promise<ChatMessage[]> => {
  try {
    let q = query(
      collection(db, 'chat_messages'),
      where('user_id', '==', userId),
      orderBy('created_at', 'asc')
    );

    if (conversationId) {
      q = query(q, where('conversation_id', '==', conversationId));
    }

    if (type) {
      q = query(q, where('type', '==', type));
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at.toDate(),
      updated_at: doc.data().updated_at.toDate()
    })) as ChatMessage[];
  } catch (error) {
    console.error('Error getting chat messages:', error);
    throw error;
  }
};

// Tuner History Functions
export const saveTunerHistory = async (tunerItem: Omit<TunerHistory, 'id' | 'created_at'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'tuner_history'), {
      ...tunerItem,
      created_at: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving tuner history:', error);
    throw error;
  }
};

export const getTunerHistory = async (userId: string, limit: number = 10): Promise<TunerHistory[]> => {
  try {
    const q = query(
      collection(db, 'tuner_history'),
      where('user_id', '==', userId),
      orderBy('created_at', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at.toDate()
    })) as TunerHistory[];
  } catch (error) {
    console.error('Error getting tuner history:', error);
    throw error;
  }
};

// Echo Personas Functions
export const saveEchoPersona = async (persona: Omit<EchoPersona, 'id' | 'created_at'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'echo_personas'), {
      ...persona,
      created_at: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving echo persona:', error);
    throw error;
  }
};

export const getEchoPersonas = async (userId: string): Promise<EchoPersona[]> => {
  try {
    const q = query(
      collection(db, 'echo_personas'),
      where('user_id', '==', userId),
      orderBy('created_at', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at.toDate()
    })) as EchoPersona[];
  } catch (error) {
    console.error('Error getting echo personas:', error);
    throw error;
  }
};

export const updateEchoPersona = async (personaId: string, updates: Partial<EchoPersona>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'echo_personas', personaId), updates);
  } catch (error) {
    console.error('Error updating echo persona:', error);
    throw error;
  }
};

export const deleteEchoPersona = async (personaId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'echo_personas', personaId));
  } catch (error) {
    console.error('Error deleting echo persona:', error);
    throw error;
  }
};