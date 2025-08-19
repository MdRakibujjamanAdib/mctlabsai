import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, ChevronRight, ChevronLeft, Trash2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

interface Conversation {
  id: string;
  title: string;
  last_message: string;
  created_at: string;
}

interface ChatHistoryProps {
  onSelectConversation: (id: string) => void;
  currentConversationId: string | null;
  showHistory: boolean;
  onClose: () => void;
}

export default function ChatHistory({ onSelectConversation, currentConversationId, showHistory, onClose }: ChatHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && showHistory) {
      loadConversations();
    }
  }, [user, showHistory]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (showHistory) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHistory, onClose]);

  const loadConversations = async () => {
    try {
      if (!user) return;

      const conversationsQuery = query(
        collection(db, 'chat_conversations'),
        where('user_id', '==', user.uid),
        orderBy('created_at', 'desc')
      );

      const querySnapshot = await getDocs(conversationsQuery);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Conversation[];
      
      setConversations(data);
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'chat_conversations', id));

      setConversations(prev => prev.filter(conv => conv.id !== id));
    } catch (err) {
      console.error('Error deleting conversation:', err);
    }
  };

  return (
    <AnimatePresence>
      {showHistory && (
        <motion.div
          ref={historyRef}
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="space-y-2 p-4 bg-white/50 backdrop-blur-sm border-b w-full md:max-w-xs"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversations</h2>
          {loading ? (
            <div className="p-4 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="p-4 text-red-600 text-center">{error}</div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-gray-500 py-4">No conversations yet</div>
          ) : (
            <div className="space-y-2">
              {conversations.map(conv => (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-lg cursor-pointer group relative ${
                    currentConversationId === conv.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                  onClick={() => onSelectConversation(conv.id)}
                >
                  <h3 className="font-medium text-sm mb-1 pr-8">{conv.title}</h3>
                  <p className="text-xs text-gray-500 truncate">{conv.last_message}</p>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded-full transition-opacity"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}