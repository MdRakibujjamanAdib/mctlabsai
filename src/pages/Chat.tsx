import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Zap, Cpu, FileUp, X, Copy, Check, History, Plus, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { betaOpenAI, advancedOpenAI, standardOpenAI } from '../lib/openai';
import { formatMessageText } from '../lib/formatText';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import ChatHistory from '../components/ChatHistory';

interface Message {
  text: string;
  isUser: boolean;
  formattedText?: boolean;
  attachments?: Array<{
    name: string;
    preview?: string;
  }>;
}

type ChatMode = 'standard' | 'beta' | 'advanced';

export default function Chat() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode>('standard');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isTemporary, setIsTemporary] = useState(false);
  const { user } = useAuth();
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset conversation on refresh
    setCurrentConversationId(null);
    setMessages([]);
  }, []);

  useEffect(() => {
    if (currentConversationId && !isTemporary) {
      loadConversationMessages(currentConversationId);
    }
  }, [currentConversationId, isTemporary]);

  const loadConversationMessages = async (conversationId: string) => {
    try {
      const messagesQuery = query(
        collection(db, 'chat_messages'),
        where('conversation_id', '==', conversationId),
        where('user_id', '==', user?.uid),
        orderBy('created_at', 'asc')
      );

      const querySnapshot = await getDocs(messagesQuery);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (data) {
        const formattedMessages: Message[] = data.map((msg: any) => ({
          text: msg.content,
          isUser: msg.role === 'user',
          formattedText: true
        }));
        setMessages(formattedMessages);
      }
    } catch (err) {
      console.error('Error loading conversation messages:', err);
      setError('Failed to load conversation messages');
    }
  };

  const createNewConversation = async (firstMessage: string) => {
    if (isTemporary) return null;
    
    try {
      const docRef = await addDoc(collection(db, 'chat_conversations'), {
        user_id: user?.uid,
        title: firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : ''),
        last_message: firstMessage,
        created_at: new Date(),
        updated_at: new Date()
      });

      return docRef.id;
    } catch (err) {
      console.error('Error creating conversation:', err);
      throw err;
    }
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setIsTemporary(false);
  };

  const toggleTemporaryMode = () => {
    setIsTemporary(!isTemporary);
    setCurrentConversationId(null);
    setMessages([]);
  };

  const saveMessage = async (content: string, isUser: boolean, conversationId: string) => {
    if (isTemporary) return;
    
    try {
      await addDoc(collection(db, 'chat_messages'), {
        user_id: user?.uid,
        conversation_id: conversationId,
        role: isUser ? 'user' : 'assistant',
        content,
        type: 'general',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Update conversation's last message
      const conversationRef = doc(db, 'chat_conversations', conversationId);
      await updateDoc(conversationRef, {
        last_message: content,
        updated_at: new Date()
      });
    } catch (err) {
      console.error('Error saving message:', err);
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!prompt.trim() && attachments.length === 0) || isLoading) return;

    const userMessage = prompt.trim();
    setPrompt('');
    setError(null);

    const newUserMessage: Message = {
      text: userMessage,
      isUser: true,
      formattedText: true,
      attachments: attachments.map(file => ({
        name: file.name,
        preview: URL.createObjectURL(file)
      }))
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      let conversationId = currentConversationId;
      if (!conversationId && !isTemporary) {
        conversationId = await createNewConversation(userMessage);
        setCurrentConversationId(conversationId);
      }

      if (conversationId) {
        await saveMessage(userMessage, true, conversationId);
      }

      let aiResponse;
      
      if (chatMode === 'standard') {
        const response = await standardOpenAI.chat.completions.create({
          messages: [{ role: "user", content: userMessage }]
        });
        aiResponse = response.choices[0]?.message?.content || 
          "I apologize, but I couldn't process your request.";
      } else if (chatMode === 'beta') {
        const messageContent = attachments.length > 0 ? [
          { type: "text", text: userMessage || "Analyze these images:" },
          ...attachments.map(file => ({
            type: "image_url",
            image_url: {
              url: URL.createObjectURL(file)
            }
          }))
        ] : userMessage;

        const messages = [{
          role: "user",
          content: messageContent
        }];

        const response = await betaOpenAI.chat.completions.create({ messages });
        aiResponse = response.choices[0]?.message?.content || 
          "I apologize, but I couldn't process your request.";
      } else {
        const response = await advancedOpenAI.chat.completions.create({
          messages: [{ role: "user", content: userMessage }]
        });
        aiResponse = response.choices[0]?.message?.content || 
          "I apologize, but I couldn't process your request.";
      }
      
      const newAiMessage: Message = {
        text: aiResponse,
        isUser: false,
        formattedText: true
      };
      
      setMessages(prev => [...prev, newAiMessage]);
      if (conversationId) {
        await saveMessage(aiResponse, false, conversationId);
      }
      setAttachments([]);
    } catch (error: any) {
      console.error('Error with AI response:', error);
      setError(error?.message || "An error occurred while processing your request. Please try again.");
      setMessages(prev => [...prev, { 
        text: "I apologize, but I encountered an error. Please try again.",
        isUser: false 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    setPrompt(e.target.value);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024
    );
    
    if (validFiles.length !== files.length) {
      setError('Some files were skipped. Only images under 5MB are allowed.');
    }

    setAttachments(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="flex flex-col h-[calc(100vh-5rem)]">
        <div className="flex-1 overflow-hidden">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full flex flex-col bg-white/80 backdrop-blur-sm relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/30 to-pink-50/30 pointer-events-none" />
            
            <div className="p-4 sm:p-5 border-b border-gray-100/10 relative">
              <div className="flex items-center justify-between">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowHistory(!showHistory)}
                  className={`saas-button px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm ${
                    showHistory
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white/50 hover:bg-white/80 text-gray-700 hover:text-blue-600 shadow-sm'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span className="relative z-10">History</span>
                </motion.button>

                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setChatMode('standard');
                      setAttachments([]);
                    }}
                    className={`saas-button px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm ${
                      chatMode === 'standard'
                        ? 'mode-button-stable text-white shadow-lg'
                        : 'bg-white/50 hover:bg-white/80 text-gray-700 hover:text-orange-600 shadow-sm'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="relative z-10">Standard</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setChatMode('beta')}
                    className={`saas-button px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm ${
                      chatMode === 'beta'
                        ? 'mode-button-beta text-white shadow-lg'
                        : 'bg-white/50 hover:bg-white/80 text-gray-700 hover:text-blue-600 shadow-sm'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span className="relative z-10">Beta</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setChatMode('advanced');
                      setAttachments([]);
                    }}
                    className={`saas-button px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm ${
                      chatMode === 'advanced'
                        ? 'mode-button-advanced text-white shadow-lg'
                        : 'bg-white/50 hover:bg-white/80 text-gray-700 hover:text-purple-600 shadow-sm'
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span className="relative z-10">Advanced</span>
                  </motion.button>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleTemporaryMode}
                  className={`saas-button px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm ${
                    isTemporary
                      ? 'bg-amber-500 text-white shadow-lg'
                      : 'bg-white/50 hover:bg-white/80 text-gray-700 hover:text-amber-600 shadow-sm'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span className="relative z-10">Temporary</span>
                </motion.button>
              </div>
            </div>

            {error && (
              <div className="px-6 py-3 bg-red-50 border-b">
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <X className="w-4 h-4" />
                  {error}
                </p>
              </div>
            )}

            {isTemporary && (
              <div className="px-6 py-3 bg-amber-50 border-b">
                <p className="text-sm text-amber-600 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Temporary mode: Messages won't be saved
                </p>
              </div>
            )}

            <ChatHistory
              onSelectConversation={setCurrentConversationId}
              currentConversationId={currentConversationId}
              showHistory={showHistory}
              onClose={() => setShowHistory(false)}
            />

            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 relative"
            >
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[90%] sm:max-w-[80%] rounded-lg p-4 relative group ${
                      msg.isUser
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-50 text-gray-900'
                    }`}
                  >
                    {!msg.isUser && (
                      <button
                        onClick={() => copyToClipboard(msg.text, index)}
                        className={`absolute top-2 right-2 p-1.5 rounded-lg transition-colors ${
                          copiedIndex === index
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200/50 text-gray-500 opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {copiedIndex === index ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <div 
                      className={`prose prose-sm sm:prose-base max-w-none ${
                        msg.isUser ? 'prose-invert' : ''
                      }`}
                      dangerouslySetInnerHTML={{ 
                        __html: msg.formattedText ? formatMessageText(msg.text) : msg.text 
                      }}
                    />
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {msg.attachments.map((attachment, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            {attachment.preview ? (
                              <img 
                                src={attachment.preview} 
                                alt={attachment.name}
                                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded"
                              />
                            ) : (
                              <div className="text-xs bg-white/20 px-2 py-1 rounded">
                                {attachment.name}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 max-w-[80%] rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {attachments.length > 0 && chatMode === 'beta' && (
              <div className="px-6 py-2 border-t">
                <div className="flex flex-wrap gap-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="relative group">
                      {file.type.startsWith('image/') ? (
                        <div className="w-16 h-16 rounded-lg overflow-hidden">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-600">
                          {file.name.split('.').pop()?.toUpperCase()}
                        </div>
                      )}
                      <button
                        onClick={() => removeAttachment(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="md:mb-4 p-4 sm:p-6 border-t backdrop-blur-sm">
              <form onSubmit={handleSubmit} className="flex gap-4">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="What can I help with?"
                  className="flex-1 px-6 py-3 bg-white/50 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner"
                  disabled={isLoading}
                />
                <div className="flex items-center gap-3">
                  {chatMode === 'beta' && (
                    <>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*"
                        className="hidden"
                        multiple
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-12 w-12 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                        disabled={isLoading}
                      >
                        <FileUp className="w-5 h-5 text-gray-700" />
                      </button>
                    </>
                  )}
                  <button
                    type="submit"
                    disabled={isLoading || (!prompt.trim() && attachments.length === 0)}
                    className="h-12 w-12 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = error => reject(error);
  });
}