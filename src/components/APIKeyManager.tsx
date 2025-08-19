import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Plus, Edit2, Trash2, Eye, EyeOff, Save, X, AlertCircle, Check, Shield } from 'lucide-react';
import { 
  APIKey, 
  getAPIKeys, 
  saveAPIKey, 
  updateAPIKey, 
  deleteAPIKey, 
  toggleAPIKeyStatus,
  initializeAPIKeys,
  DEFAULT_API_SERVICES
} from '../lib/apiKeyManager';

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

export default function APIKeyManager() {
  const [apiKeys, setAPIKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<APIKey | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    service_name: '',
    display_name: '',
    api_key: '',
    description: '',
    is_active: true
  });

  useEffect(() => {
    loadAPIKeys();
  }, []);

  const loadAPIKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Initialize default keys if needed
      await initializeAPIKeys();
      
      const keys = await getAPIKeys();
      setAPIKeys(keys);
    } catch (err: any) {
      console.error('Error loading API keys:', err);
      setError(err.message || 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKey = async () => {
    try {
      setError(null);
      
      if (editingKey) {
        await updateAPIKey(editingKey.id, {
          display_name: formData.display_name,
          api_key: formData.api_key,
          description: formData.description,
          is_active: formData.is_active
        });
        setSuccess('API key updated successfully');
      } else {
        await saveAPIKey({
          service_name: formData.service_name,
          display_name: formData.display_name,
          api_key: formData.api_key,
          description: formData.description,
          is_active: formData.is_active
        });
        setSuccess('API key added successfully');
      }

      setShowEditModal(false);
      setShowAddModal(false);
      setEditingKey(null);
      setFormData({
        service_name: '',
        display_name: '',
        api_key: '',
        description: '',
        is_active: true
      });
      
      await loadAPIKeys();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving API key:', err);
      setError(err.message || 'Failed to save API key');
    }
  };

  const handleEditKey = (key: APIKey) => {
    setEditingKey(key);
    setFormData({
      service_name: key.service_name,
      display_name: key.display_name,
      api_key: key.api_key,
      description: key.description,
      is_active: key.is_active
    });
    setShowEditModal(true);
  };

  const handleAddKey = () => {
    setEditingKey(null);
    setFormData({
      service_name: '',
      display_name: '',
      api_key: '',
      description: '',
      is_active: true
    });
    setShowAddModal(true);
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      await deleteAPIKey(id);
      setSuccess('API key deleted successfully');
      await loadAPIKeys();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting API key:', err);
      setError(err.message || 'Failed to delete API key');
    }
  };

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    try {
      await toggleAPIKeyStatus(id, isActive);
      setSuccess(`API key ${isActive ? 'enabled' : 'disabled'} successfully`);
      await loadAPIKeys();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error toggling API key status:', err);
      setError(err.message || 'Failed to update API key status');
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const maskAPIKey = (key: string) => {
    if (!key) return 'Not configured';
    if (key.length <= 8) return '*'.repeat(key.length);
    return key.substring(0, 4) + '*'.repeat(key.length - 8) + key.substring(key.length - 4);
  };

  const getServiceIcon = (serviceName: string) => {
    const icons: Record<string, string> = {
      openrouter_standard: '💬',
      openrouter_beta: '👁️',
      openrouter_advanced: '🧠',
      openrouter_coder: '💻',
      openrouter_echo: '🎭',
      elevenlabs: '🎵',
      minimaxi: '🎬',
      xet_standard: '🎨',
      xet_flash: '⚡'
    };
    return icons[serviceName] || '🔑';
  };

  const getServiceColor = (serviceName: string) => {
    const colors: Record<string, string> = {
      openrouter_standard: 'bg-blue-100 text-blue-800 border-blue-200',
      openrouter_beta: 'bg-purple-100 text-purple-800 border-purple-200',
      openrouter_advanced: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      openrouter_coder: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      openrouter_echo: 'bg-pink-100 text-pink-800 border-pink-200',
      elevenlabs: 'bg-green-100 text-green-800 border-green-200',
      minimaxi: 'bg-red-100 text-red-800 border-red-200',
      xet_standard: 'bg-orange-100 text-orange-800 border-orange-200',
      xet_flash: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    return colors[serviceName] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getServiceStatus = (key: APIKey) => {
    if (!key.api_key || key.api_key.trim() === '') {
      return { status: 'not-configured', color: 'text-red-400', text: 'Not Configured' };
    }
    if (!key.is_active) {
      return { status: 'disabled', color: 'text-yellow-400', text: 'Disabled' };
    }
    return { status: 'active', color: 'text-green-400', text: 'Active' };
  };

  const getMissingServices = () => {
    const existingServices = apiKeys.map(key => key.service_name);
    return DEFAULT_API_SERVICES.filter(service => !existingServices.includes(service.service_name));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-6"
    >
      <motion.div variants={fadeIn} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">API Key Management</h2>
          <p className="text-gray-400 mt-1">
            Configure API keys for different AI models. Keys are publicly readable for app functionality.
          </p>
          <div className="mt-2 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
            <p className="text-blue-200 text-sm flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <strong>Security Note:</strong> API keys are publicly readable to allow all users to access AI features. 
              Only modify keys you want the entire platform to use.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {getMissingServices().length > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAddKey}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Service</span>
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadAPIKeys}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            <span>Refresh</span>
          </motion.button>
        </div>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-900/50 border border-red-700 rounded-lg flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-red-200">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-900/50 border border-green-700 rounded-lg flex items-center gap-3"
        >
          <Check className="w-5 h-5 text-green-400" />
          <p className="text-green-200">{success}</p>
        </motion.div>
      )}

      <motion.div variants={fadeIn} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {apiKeys.map((key) => (
          <motion.div
            key={key.id}
            variants={fadeIn}
            className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getServiceIcon(key.service_name)}</span>
                <div>
                  <h3 className="font-medium text-white">{key.display_name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getServiceColor(key.service_name)}`}>
                      {key.service_name}
                    </span>
                    <span className={`text-xs font-medium ${getServiceStatus(key).color}`}>
                      {getServiceStatus(key).text}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEditKey(key)}
                  className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors"
                  title="Edit API Key"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteKey(key.id)}
                  className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                  title="Delete API Key"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-400 mb-4">{key.description}</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">API Key</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-gray-900 px-2 py-1 rounded font-mono text-gray-300">
                    {visibleKeys.has(key.id) ? key.api_key || 'Not configured' : maskAPIKey(key.api_key)}
                  </code>
                  <button
                    onClick={() => toggleKeyVisibility(key.id)}
                    className="p-1 text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    {visibleKeys.has(key.id) ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Status</span>
                <button
                  onClick={() => handleToggleStatus(key.id, !key.is_active)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    key.is_active ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      key.is_active ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="text-xs text-gray-500">
                Updated: {key.updated_at.toLocaleDateString()}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Missing Services Alert */}
      {getMissingServices().length > 0 && (
        <motion.div variants={fadeIn} className="p-4 bg-yellow-900/50 border border-yellow-700 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-200 mb-2">Missing API Services</h3>
              <p className="text-yellow-300 text-sm mb-3">
                The following services are not configured yet:
              </p>
              <div className="space-y-1">
                {getMissingServices().map(service => (
                  <div key={service.service_name} className="text-sm text-yellow-200">
                    • {service.display_name} - {service.description}
                  </div>
                ))}
              </div>
              <button
                onClick={handleAddKey}
                className="mt-3 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 rounded text-sm transition-colors"
              >
                Add Missing Services
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showEditModal || showAddModal) && (
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
              className="bg-gray-800 rounded-xl w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-white">
                  {editingKey ? 'Edit API Key' : 'Add API Key'}
                </h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setShowAddModal(false);
                    setEditingKey(null);
                    setError(null);
                  }}
                  className="p-2 hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                {!editingKey && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Service Type
                    </label>
                    <select
                      value={formData.service_name}
                      onChange={(e) => {
                        const selectedService = DEFAULT_API_SERVICES.find(s => s.service_name === e.target.value);
                        if (selectedService) {
                          setFormData(prev => ({
                            ...prev,
                            service_name: selectedService.service_name,
                            display_name: selectedService.display_name,
                            description: selectedService.description
                          }));
                        }
                      }}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
                    >
                      <option value="">Select a service...</option>
                      {getMissingServices().map(service => (
                        <option key={service.service_name} value={service.service_name}>
                          {service.display_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {editingKey && (
                  <div className="mb-4 p-3 bg-gray-700 rounded-lg">
                    <h4 className="font-medium text-white mb-1">{formData.display_name}</h4>
                    <p className="text-sm text-gray-400">{formData.description}</p>
                    <p className="text-xs text-gray-500 mt-1">Service: {formData.service_name}</p>
                  </div>
                )}

                {!editingKey && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={formData.display_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
                        placeholder="Enter display name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
                        rows={2}
                        placeholder="Enter description"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={formData.api_key}
                    onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
                    placeholder="Enter API key"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">Active</span>
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.is_active ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.is_active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setShowAddModal(false);
                    setEditingKey(null);
                    setError(null);
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveKey}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingKey ? 'Update' : 'Add'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}