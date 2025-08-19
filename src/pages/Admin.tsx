import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Settings, AlertCircle, Check, X, Edit2, Save, Key } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function Admin() {
  const { user } = useAuth();
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user?.user_metadata?.username) {
      setNewUsername(user.user_metadata.username);
    }
  }, [user]);

  const handleCredentialsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (newPassword && newPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (passwordError) throw passwordError;
      }

      if (newUsername !== user?.user_metadata?.username) {
        const { error: updateError } = await supabase.auth.updateUser({
          data: { 
            ...user?.user_metadata,
            username: newUsername
          }
        });

        if (updateError) throw updateError;
      }

      setSuccess('Credentials updated successfully');
      setShowPasswordChange(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Error updating credentials:', err);
      setError(err.message);
    }
  };

  // Rest of the Admin component remains unchanged
  return (
    <div className="min-h-screen pt-24 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Admin Settings</h2>
              <p className="text-gray-600 mt-2">Manage your admin credentials</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-center gap-3 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg flex items-center gap-3 text-green-700">
                <Check className="w-5 h-5" />
                <p>{success}</p>
              </div>
            )}

            <form onSubmit={handleCredentialsUpdate} className="max-w-md space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter new username"
                />
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setShowPasswordChange(!showPasswordChange)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                >
                  <Key className="w-4 h-4" />
                  <span>{showPasswordChange ? 'Cancel password change' : 'Change password'}</span>
                </button>
              </div>

              {showPasswordChange && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter new password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Confirm new password"
                    />
                  </div>
                </>
              )}

              <div className="pt-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}