import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Database, Settings, LogOut, Plus, Edit2, Trash2, 
  Shield, AlertCircle, Check, X, Search, Filter, Eye, 
  UserCheck, UserX, Crown, Activity, Brain, Save, Key
} from 'lucide-react';
import { 
  AdminUser, UserManagementLog,
  getAllUsers, updateUserRole, toggleUserAccess,
  getUserManagementLogs
} from '../lib/adminAuth';
import {
  AIAgent, AIContextEntry,
  getAIAgents, getAIContextEntries, saveAIContextEntry, updateAIContextEntry,
  deleteAIContextEntry, generateSystemPromptForAgents, initializeAIAgents,
  initializeSystemContext, generateContextMetadata
} from '../lib/aiContext';
import APIKeyManager from '../components/APIKeyManager';
import { auth } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { initializeAPIKeys } from '../lib/apiKeyManager';

type TabType = 'users' | 'context' | 'analytics' | 'settings' | 'api-keys';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [aiAgents, setAIAgents] = useState<AIAgent[]>([]);
  const [aiContextEntries, setAIContextEntries] = useState<AIContextEntry[]>([]);
  const [logs, setLogs] = useState<UserManagementLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showContextModal, setShowContextModal] = useState(false);
  const [editingContext, setEditingContext] = useState<AIContextEntry | null>(null);
  const [contextForm, setContextForm] = useState({
    content: '',
    selectedAgents: [] as string[]
  });
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check Firebase admin authentication
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        await logSecurityEvent('ADMIN_DASHBOARD_UNAUTHORIZED_ACCESS', null);
        navigate('/loginasadib');
        return;
      }

      try {
        // Fetch user profile from Firestore to verify admin status
        const userProfileRef = doc(db, 'profiles', user.uid);
        const userProfileSnap = await getDoc(userProfileRef);
        
        if (!userProfileSnap.exists()) {
          console.error('User profile not found');
          navigate('/');
          return;
        }
        
        const userProfile = userProfileSnap.data();
        
        // Check if user has admin privileges
        if (!userProfile.isAdmin) {
          console.error('User does not have admin privileges');
          await logSecurityEvent('NON_ADMIN_DASHBOARD_ACCESS_ATTEMPT', user);
          navigate('/');
          return;
        }
        
        // Additional security check for admin email
        if (user.email !== 'admin@mctlabs.tech') {
          console.error('Invalid admin email');
          await logSecurityEvent('INVALID_ADMIN_EMAIL_DASHBOARD_ACCESS', user);
          navigate('/');
          return;
        }
        
        // User is confirmed admin, set admin user state
        setAdminUser({
          id: user.uid,
          username: user.displayName || userProfile.full_name || 'Admin',
          email: user.email || '',
          password: '',
          isActive: true,
          permissions: {
            manageUsers: true,
            manageContext: true,
            viewAnalytics: true,
            systemSettings: true
          },
          createdAt: new Date(),
          lastLogin: new Date()
        });
        
        // Only initialize data after confirming admin status
        await initializeData();
        loadData();
      } catch (error) {
        console.error('Error verifying admin status:', error);
        setError('Failed to verify admin permissions');
        navigate('/');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const initializeData = async () => {
    try {
      await Promise.all([
        initializeAIAgents(),
        initializeSystemContext(),
        initializeAPIKeys()
      ]);
    } catch (error) {
      console.error('Error initializing data:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, agentsData, contextData, logsData] = await Promise.all([
        getAllUsers(),
        getAIAgents(),
        getAIContextEntries(),
        getUserManagementLogs()
      ]);
      
      setUsers(usersData);
      setAIAgents(agentsData);
      setAIContextEntries(contextData);
      setLogs(logsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminUser');
    navigate('/');
  };

  const handleSaveContext = async () => {
    try {
      setIsGeneratingMetadata(true);
      
      if (editingContext) {
        const { title, category } = await generateContextMetadata(contextForm.content);
        await updateAIContextEntry(editingContext.id!, {
          content: contextForm.content,
          ai_generated_title: title,
          ai_generated_category: category,
          selected_agents: contextForm.selectedAgents
        });
      } else {
        await saveAIContextEntry(contextForm.content, contextForm.selectedAgents);
      }
      
      setShowContextModal(false);
      setEditingContext(null);
      setContextForm({ content: '', selectedAgents: [] });
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGeneratingMetadata(false);
    }
  };

  const handleEditContext = (context: AIContextEntry) => {
    setEditingContext(context);
    setContextForm({
      content: context.content,
      selectedAgents: context.selected_agents
    });
    setShowContextModal(true);
  };

  const handleDeleteContext = async (id: string) => {
    if (confirm('Are you sure you want to delete this context entry?')) {
      try {
        await deleteAIContextEntry(id);
        loadData();
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const handleUserRoleChange = async (userId: string, isAdmin: boolean) => {
    if (!adminUser) return;
    
    try {
      await updateUserRole(userId, isAdmin, adminUser.id, adminUser.username);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUserAccessToggle = async (userId: string, isActive: boolean) => {
    if (!adminUser) return;
    
    try {
      await toggleUserAccess(userId, isActive, adminUser.id, adminUser.username);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGeneratePrompt = async () => {
    try {
      const selectedAgentIds = aiAgents.map(agent => agent.id);
      const prompts = await generateSystemPromptForAgents(selectedAgentIds);
      
      let combinedPrompt = 'Generated System Prompts for All AI Agents:\n\n';
      Object.entries(prompts).forEach(([agentId, prompt]) => {
        const agent = aiAgents.find(a => a.id === agentId);
        combinedPrompt += `=== ${agent?.name || 'Unknown Agent'} ===\n${prompt}\n\n`;
      });
      
      setGeneratedPrompt(combinedPrompt);
      setShowPromptModal(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAgentToggle = (agentId: string) => {
    setContextForm(prev => ({
      ...prev,
      selectedAgents: prev.selectedAgents.includes(agentId)
        ? prev.selectedAgents.filter(id => id !== agentId)
        : [...prev.selectedAgents, agentId]
    }));
  };

  const handleSelectAllAgents = () => {
    const allAgentIds = aiAgents.map(agent => agent.id);
    setContextForm(prev => ({
      ...prev,
      selectedAgents: prev.selectedAgents.length === allAgentIds.length ? [] : allAgentIds
    }));
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContextEntries = aiContextEntries.filter(entry =>
    entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.ai_generated_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.ai_generated_category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Shield className="w-8 h-8 text-blue-500" />
            <div>
              <h1 className="text-xl font-bold">MCT Labs Admin Panel</h1>
              <p className="text-sm text-gray-400">Welcome, {adminUser?.username}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-gray-800 border-r border-gray-700 min-h-[calc(100vh-73px)]">
          <div className="p-4 space-y-2">
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>User Management</span>
            </button>
            <button
              onClick={() => setActiveTab('context')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'context' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Database className="w-5 h-5" />
              <span>AI Context Database</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'analytics' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Activity className="w-5 h-5" />
              <span>Activity Logs</span>
            </button>
            <button
              onClick={() => setActiveTab('api-keys')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'api-keys' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Key className="w-5 h-5" />
              <span>API Keys</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>System Settings</span>
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-200">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {activeTab === 'users' && (
              <motion.div
                key="users"
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={staggerContainer}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">User Management</h2>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search users..."
                        className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Department
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-700/50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                                  alt={user.full_name}
                                  className="w-8 h-8 rounded-full"
                                />
                                <div>
                                  <div className="font-medium">{user.full_name || 'Unknown'}</div>
                                  <div className="text-sm text-gray-400">{user.email || 'No email'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-300">
                              {user.department || 'Not specified'}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                user.isAdmin 
                                  ? 'bg-purple-900/50 text-purple-300 border border-purple-700'
                                  : 'bg-gray-700 text-gray-300'
                              }`}>
                                {user.isAdmin ? <Crown className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                                {user.isAdmin ? 'Admin' : 'User'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                user.isActive !== false
                                  ? 'bg-green-900/50 text-green-300 border border-green-700'
                                  : 'bg-red-900/50 text-red-300 border border-red-700'
                              }`}>
                                {user.isActive !== false ? 'Active' : 'Disabled'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleUserRoleChange(user.id, !user.isAdmin)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    user.isAdmin
                                      ? 'bg-red-600 hover:bg-red-700 text-white'
                                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                                  }`}
                                  title={user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                                >
                                  {user.isAdmin ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => handleUserAccessToggle(user.id, user.isActive === false)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    user.isActive !== false
                                      ? 'bg-red-600 hover:bg-red-700 text-white'
                                      : 'bg-green-600 hover:bg-green-700 text-white'
                                  }`}
                                  title={user.isActive !== false ? 'Disable User' : 'Enable User'}
                                >
                                  {user.isActive !== false ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'context' && (
              <motion.div
                key="context"
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={staggerContainer}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">AI Context Database</h2>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search context..."
                        className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
                      />
                    </div>
                    <button
                      onClick={handleGeneratePrompt}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Brain className="w-4 h-4" />
                      <span>Generate AI Prompts</span>
                    </button>
                    <button
                      onClick={() => {
                        setEditingContext(null);
                        setContextForm({ content: '', selectedAgents: [] });
                        setShowContextModal(true);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Context</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredContextEntries.map((entry) => (
                    <div key={entry.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-medium text-blue-300 mb-1">{entry.ai_generated_title}</h3>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-full">
                              {entry.ai_generated_category}
                            </span>
                            <span className="text-xs text-purple-400">
                              {entry.selected_agents.length === aiAgents.length ? 'All Agents' : `${entry.selected_agents.length} Agents`}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditContext(entry)}
                            className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteContext(entry.id!)}
                            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {entry.content}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={staggerContainer}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold">Activity Logs</h2>
                
                <div className="bg-gray-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Admin
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Action
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Target User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Details
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Timestamp
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {logs.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-700/50">
                            <td className="px-6 py-4 text-sm">{log.adminUsername}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                log.action.includes('GRANT') ? 'bg-green-900/50 text-green-300' :
                                log.action.includes('REVOKE') ? 'bg-red-900/50 text-red-300' :
                                log.action.includes('ENABLE') ? 'bg-blue-900/50 text-blue-300' :
                                'bg-gray-700 text-gray-300'
                              }`}>
                                {log.action.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-300">{log.targetUserEmail}</td>
                            <td className="px-6 py-4 text-sm text-gray-400">{log.details}</td>
                            <td className="px-6 py-4 text-sm text-gray-400">
                              {log.timestamp.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'api-keys' && (
              <motion.div
                key="api-keys"
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={staggerContainer}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">API Key Management</h2>
                  <p className="text-gray-400">
                    Manage API keys for different AI models. Each service can have its own API key for better control and monitoring.
                  </p>
                  <div className="mt-4 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
                    <p className="text-yellow-200 text-sm">
                      <strong>Service Separation:</strong> You can now configure different API keys for:
                    </p>
                    <ul className="text-blue-200 text-sm mt-2 space-y-1 ml-4">
                      <li>• <strong>Standard Chat:</strong> DeepSeek Chat v3 for general conversations</li>
                      <li>• <strong>Beta Chat:</strong> Qwen 2.5 VL for vision-enabled conversations</li>
                      <li>• <strong>Advanced Chat:</strong> DeepSeek R1 for complex reasoning</li>
                      <li>• <strong>Code Analysis:</strong> Qwen 2.5 Coder for programming help</li>
                      <li>• <strong>Echo Personas:</strong> Mistral 7B for role-playing scenarios</li>
                      <li>• <strong>Image Generation:</strong> XET API for Standard/Flash modes</li>
                      <li>• <strong>Speech Services:</strong> ElevenLabs for text-to-speech</li>
                      <li>• <strong>Animation:</strong> MiniMaxi for video generation</li>
                    </ul>
                  </div>
                </div>
                <APIKeyManager />
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={staggerContainer}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold">System Settings</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">System Statistics</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Users:</span>
                        <span className="font-medium">{users.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Active Users:</span>
                        <span className="font-medium">{users.filter(u => u.isActive !== false).length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Admin Users:</span>
                        <span className="font-medium">{users.filter(u => u.isAdmin).length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">AI Agents:</span>
                        <span className="font-medium">{aiAgents.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Context Entries:</span>
                        <span className="font-medium">{aiContextEntries.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Admin Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Username:</span>
                        <span className="font-medium">{adminUser?.username}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Email:</span>
                        <span className="font-medium">{adminUser?.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Last Login:</span>
                        <span className="font-medium">
                          {adminUser?.lastLogin?.toLocaleString() || 'Current session'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Context Modal */}
      <AnimatePresence>
        {showContextModal && (
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
              className="bg-gray-800 rounded-xl w-full max-w-2xl p-6"
            >
              <h3 className="text-lg font-medium mb-4">
                {editingContext ? 'Edit AI Context' : 'Add AI Context'}
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Select AI Agents (AI will auto-categorize and title this context)
                  </label>
                  
                  <div className="mb-4">
                    <button
                      onClick={handleSelectAllAgents}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm transition-colors"
                    >
                      {contextForm.selectedAgents.length === aiAgents.length ? 'Deselect All' : 'Select All Agents'}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {aiAgents.map(agent => (
                      <label
                        key={agent.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          contextForm.selectedAgents.includes(agent.id)
                            ? 'bg-blue-900/30 border-blue-600 text-blue-300'
                            : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={contextForm.selectedAgents.includes(agent.id)}
                          onChange={() => handleAgentToggle(agent.id)}
                          className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{agent.name}</div>
                          <div className="text-xs text-gray-400">{agent.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Context Information
                  </label>
                  <textarea
                    value={contextForm.content}
                    onChange={(e) => setContextForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Enter context information that the AI should know. The AI will automatically generate a title and categorize this information.

Examples:
- Student information and achievements
- Course details and requirements  
- Department events and announcements
- Faculty information and expertise
- Platform features and capabilities"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white min-h-[120px] resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    💡 The AI will automatically generate a title and category for this context based on the content you provide.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => {
                    setShowContextModal(false);
                    setEditingContext(null);
                    setContextForm({ content: '', selectedAgents: [] });
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveContext}
                  disabled={!contextForm.content.trim() || contextForm.selectedAgents.length === 0 || isGeneratingMetadata}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingMetadata ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Context</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generated Prompt Modal */}
      <AnimatePresence>
        {showPromptModal && (
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
              className="bg-gray-800 rounded-xl w-full max-w-6xl max-h-[80vh] overflow-hidden"
            >
              <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-medium">Generated AI System Prompts</h3>
                <button
                  onClick={() => setShowPromptModal(false)}
                  className="p-2 hover:bg-gray-700 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <pre className="text-sm text-gray-300 whitespace-pre-wrap bg-gray-900 p-4 rounded-lg border border-gray-700">
                  {generatedPrompt}
                </pre>
              </div>
              <div className="p-6 border-t border-gray-700 flex justify-end">
                <button
                  onClick={() => navigator.clipboard.writeText(generatedPrompt)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Copy to Clipboard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}