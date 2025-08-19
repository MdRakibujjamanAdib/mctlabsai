import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Plus, History, Settings, Save, AlertCircle, Bot, User, Wand2, Copy, Check, Trash2, Edit2, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getEchoPersonas, saveEchoPersona, updateEchoPersona, deleteEchoPersona, getChatMessages, saveChatMessage } from '../lib/firebaseHistory';
import { echoOpenAI } from '../lib/openai';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
}

interface EchoPersona {
  id: string;
  name: string;
  description: string;
  prompt: string;
  isDefault?: boolean;
  created_at: string;
}

const DEFAULT_PERSONAS: EchoPersona[] = [
  {
    id: 'chairman',
    name: 'Chairman',
    description: 'University chairman persona for academic guidance',
    prompt: 'You are the chairman of a prestigious university. You are wise, professional, and focused on academic excellence. You speak formally and often reference educational policies and academic standards.',
    isDefault: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'proctor',
    name: 'Proctor',
    description: 'Examination proctor for test preparation',
    prompt: 'You are a university examination proctor. You are strict about rules, detail-oriented, and focused on maintaining academic integrity. You provide guidance about exam procedures and regulations.',
    isDefault: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'english-professor',
    name: 'English Professor',
    description: 'Virtual English professor for language learning',
    prompt: 'You are an English professor with expertise in literature and language. You are eloquent, encouraging, and passionate about helping students improve their English skills. You often reference literary works and provide constructive feedback.',
    isDefault: true,
    created_at: new Date().toISOString()
  }
];

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function Echo() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<EchoPersona>(DEFAULT_PERSONAS[0]);
  const [customPersona, setCustomPersona] = useState({
    name: '',
    description: '',
    prompt: ''
  });
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingPersona, setEditingPersona] = useState<EchoPersona | null>(null);
  const [userPersonas, setUserPersonas] = useState<EchoPersona[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadUserPersonas();
      loadChatHistory();
    }
  }, [user]);

  useEffect(() => {
    const mainContent = document.querySelector('main');
    if (mainContent && showHistory !== undefined) {
      mainContent.scrollTop = 0;
    }
  }, [showHistory]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadUserPersonas = async () => {
    try {
      if (!user?.uid) return;
      const personas = await getEchoPersonas(user.uid);
      setUserPersonas(personas || []);
    } catch (err) {
      console.error('Error loading personas:', err);
      setError('Failed to load personas');
    }
  };

  const loadChatHistory = async () => {
    try {
      if (!user?.uid) return;
      const messages = await getChatMessages(user.uid, 'echo');
      setMessages(messages || []);
    } catch (err) {
      console.error('Error loading chat history:', err);
      setError('Failed to load chat history');
    }
  };

  const saveMessage = async (content: string, role: 'user' | 'assistant') => {
    try {
      if (!user?.uid) throw new Error('User not authenticated');
      await saveChatMessage({
        user_id: user.uid,
        content,
        role,
        type: 'echo'
      });
    } catch (err) {
      console.error('Error saving message:', err);
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);

    try {
      await saveMessage(userMessage, 'user');
      setMessages(prev => [...prev, { 
        id: Date.now().toString(),
        content: userMessage,
        role: 'user',
        created_at: new Date().toISOString()
      }]);

      setIsLoading(true);
      const response = await echoOpenAI.chat.completions.create({
        messages: [
          { role: 'system', content: selectedPersona.prompt },
          { role: 'user', content: userMessage }
        ]
      });

      const aiResponse = response.choices[0]?.message?.content || 
        "I apologize, but I couldn't process your request.";

      await saveMessage(aiResponse, 'assistant');
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: aiResponse,
        role: 'assistant',
        created_at: new Date().toISOString()
      }]);

      scrollToBottom();
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Echo service is temporarily unavailable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveCustomPersona = async () => {
    try {
      if (!user?.uid) throw new Error('User not authenticated');
      
      if (editingPersona) {
        await updateEchoPersona(editingPersona.id, {
          name: customPersona.name,
          description: customPersona.description,
          prompt: customPersona.prompt
        });
      } else {
        await saveEchoPersona(user.uid, {
          name: customPersona.name,
          description: customPersona.description,
          prompt: customPersona.prompt
        });
      }
      
      await loadUserPersonas();
      setShowCustomizeModal(false);
      setEditingPersona(null);
      setCustomPersona({ name: '', description: '', prompt: '' });
    } catch (err) {
      console.error('Error saving persona:', err);
      setError('Failed to save Echo');
    }
  };

  const deletePersona = async (id: string) => {
    try {
      await deleteEchoPersona(id);
      await loadUserPersonas();
    } catch (err) {
      console.error('Error deleting persona:', err);
      setError('Failed to delete Echo');
    }
  };

  const handleEditPersona = (persona: EchoPersona) => {
    setEditingPersona(persona);
    setCustomPersona({
      name: persona.name,
      description: persona.description,
      prompt: persona.prompt
    });
    setShowCustomizeModal(true);
    setShowSettingsModal(false);
  };

  const handleSelectPersona = (persona: EchoPersona) => {
    setSelectedPersona(persona);
    setIsDropdownOpen(false);
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
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-purple-50/30 to-pink-50/30 pointer-events-none" />

            <div className="p-4 sm:p-5 border-b border-gray-100/10 relative">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowHistory(!showHistory)}
                  className={`saas-button px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm ${
                    showHistory
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-white/50 hover:bg-white/80 text-gray-700 hover:text-indigo-600 shadow-sm'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span className="relative z-10">History</span>
                </motion.button>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-none" ref={dropdownRef}>
                    <motion.button
                      whileHover={{ 
                        scale: 1.02,
                        boxShadow: "0 10px 25px rgba(99, 102, 241, 0.2)"
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className={`
                        relative px-4 sm:px-6 py-2 sm:py-3 rounded-xl
                        bg-gradient-to-r from-indigo-500 to-purple-500
                        hover:from-indigo-600 hover:to-purple-600
                        text-white shadow-lg hover:shadow-xl
                        transition-all duration-300
                        flex items-center gap-3
                        w-full sm:w-auto
                        group
                      `}
                    >
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition-colors">
                        <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <span className="flex-1 text-left font-medium text-sm sm:text-base whitespace-nowrap overflow-hidden text-ellipsis">
                        {selectedPersona.name}
                      </span>
                      <ChevronDown 
                        className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 flex-shrink-0 text-white/80 group-hover:text-white ${
                          isDropdownOpen ? 'rotate-180' : ''
                        }`} 
                      />
                    </motion.button>

                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl overflow-hidden z-50 border border-gray-100"
                        >
                          <div className="divide-y divide-gray-100">
                            <div className="py-2">
                              <div className="px-3 py-2">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Default Echos</p>
                              </div>
                              {DEFAULT_PERSONAS.map(persona => (
                                <button
                                  key={persona.id}
                                  onClick={() => handleSelectPersona(persona)}
                                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                                    selectedPersona.id === persona.id ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700'
                                  }`}
                                >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                    selectedPersona.id === persona.id ? 'bg-indigo-100' : 'bg-gray-100'
                                  }`}>
                                    <Bot className="w-4 h-4" />
                                  </div>
                                  <span className="font-medium">{persona.name}</span>
                                </button>
                              ))}
                            </div>

                            {userPersonas.length > 0 && (
                              <div className="py-2">
                                <div className="px-3 py-2">
                                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">My Echos</p>
                                </div>
                                {userPersonas.map(persona => (
                                  <button
                                    key={persona.id}
                                    onClick={() => handleSelectPersona(persona)}
                                    className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                                      selectedPersona.id === persona.id ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700'
                                    }`}
                                  >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                      selectedPersona.id === persona.id ? 'bg-indigo-100' : 'bg-gray-100'
                                    }`}>
                                      <Bot className="w-4 h-4" />
                                    </div>
                                    <span className="font-medium">{persona.name}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setShowCustomizeModal(true);
                        setEditingPersona(null);
                        setCustomPersona({ name: '', description: '', prompt: '' });
                      }}
                      className="p-2 sm:p-2.5 rounded-xl bg-white/80 hover:bg-white text-gray-700 hover:text-purple-600 shadow-md hover:shadow-lg transition-all"
                    >
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowSettingsModal(true)}
                      className="p-2 sm:p-2.5 rounded-xl bg-white/80 hover:bg-white text-gray-700 hover:text-purple-600 shadow-md hover:shadow-lg transition-all"
                    >
                      <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="px-6 py-3 bg-red-50 border-b">
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </p>
              </div>
            )}

            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 relative"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 flex items-start gap-3 backdrop-blur-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                        : 'bg-white/80 shadow-md'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        msg.role === 'user' ? 'bg-white/20' : 'bg-gradient-to-br from-purple-100 to-indigo-100'
                      }`}>
                        <Bot className={`w-4 h-4 ${
                          msg.role === 'user' ? 'text-white' : 'text-purple-600'
                        }`} />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className={msg.role === 'user' ? 'text-white' : 'text-gray-800'}>
                        {msg.content}
                      </p>
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/80 backdrop-blur-sm max-w-[75%] rounded-2xl p-4 shadow-md">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 sm:p-6 border-t backdrop-blur-sm">
              <form onSubmit={handleSubmit} className="flex gap-4">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Chat with ${selectedPersona.name}...`}
                  className="flex-1 px-6 py-3 bg-white/50 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </motion.button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b flex items-center justify-between">
                <h3 className="text-lg font-medium">Echo Settings</h3>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="space-y-6">
                  {userPersonas.map(persona => (
                    <div
                      key={persona.id}
                      className="bg-white rounded-xl p-4 border shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-lg font-medium">{persona.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{persona.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleEditPersona(persona)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => deletePersona(persona.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {userPersonas.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No custom Echos yet</p>
                      <button
                        onClick={() => {
                          setShowSettingsModal(false);
                          setShowCustomizeModal(true);
                        }}
                        className="mt-4 text-purple-600 hover:text-purple-700 font-medium"
                      >
                        Create your first Echo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create/Edit Echo Modal */}
      <AnimatePresence>
        {showCustomizeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b">
                <h3 className="text-lg font-medium">
                  {editingPersona ? 'Edit Echo' : 'Create New Echo'}
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={customPersona.name}
                    onChange={(e) => setCustomPersona(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Give your Echo a name..."
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={customPersona.description}
                    onChange={(e) => setCustomPersona(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Briefly describe your Echo..."
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Personality Prompt
                  </label>
                  <textarea
                    value={customPersona.prompt}
                    onChange={(e) => setCustomPersona(prev => ({ ...prev, prompt: e.target.value }))}
                    placeholder="Describe the personality, tone, and behavior of your Echo..."
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[100px]"
                  />
                </div>
              </div>
              <div className="p-6 bg-gray-50 flex justify-end gap-4">
                <button
                  onClick={() => {
                    setShowCustomizeModal(false);
                    setEditingPersona(null);
                    setCustomPersona({ name: '', description: '', prompt: '' });
                  }}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={saveCustomPersona}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Echo</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}