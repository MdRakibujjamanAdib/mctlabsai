import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Building2, GraduationCap, Key, Save, AlertCircle, Upload, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db, auth, storage } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { updateEmail, sendPasswordResetEmail } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface ProfileData {
  id: string;
  full_name: string;
  university: string;
  department: string;
  about: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    university: '',
    department: '',
    about: ''
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  useEffect(() => {
    if (user?.email) {
      setNewEmail(user.email);
    }
  }, [user?.email]);

  const loadProfile = async () => {
    try {
      if (!user) return;

      // Try to get existing profile from Firestore
      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        const existingProfile = profileSnap.data() as ProfileData;
        setProfile(existingProfile);
        setFormData({
          full_name: existingProfile.full_name || user.displayName || '',
          university: existingProfile.university || '',
          department: existingProfile.department || '',
          about: existingProfile.about || ''
        });
      } else {
        // If no profile exists, create one with default values
        const defaultProfile: ProfileData = {
          id: user.uid,
          full_name: user.displayName || '',
          university: '',
          department: '',
          about: '',
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        await setDoc(profileRef, defaultProfile);
        setProfile(defaultProfile);
        setFormData({
          full_name: user.displayName || '',
          university: '',
          department: '',
          about: ''
        });
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Update email if changed
      if (user?.email && newEmail !== user.email && auth.currentUser) {
        await updateEmail(auth.currentUser, newEmail);
      }

      // Update profile data in Firestore
      if (user) {
        const profileRef = doc(db, 'profiles', user.uid);
        await updateDoc(profileRef, {
          ...formData,
          updated_at: new Date().toISOString()
        });
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploadingPhoto(true);
      setError(null);

      // Check file type and size
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        throw new Error('File size must be less than 5MB');
      }

      // Upload to Firebase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `avatars/${user.uid}-${Date.now()}.${fileExt}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Update profile with new avatar URL
      const profileRef = doc(db, 'profiles', user.uid);
      await updateDoc(profileRef, {
        avatar_url: downloadURL,
        updated_at: new Date().toISOString()
      });

      // Reload profile
      await loadProfile();
    } catch (err: any) {
      console.error('Error uploading photo:', err);
      setError(err.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePasswordReset = async () => {
    try {
      setError(null);
      if (user?.email) {
        await sendPasswordResetEmail(auth, user.email);
        setPasswordResetSent(true);
      }
    } catch (err: any) {
      console.error('Error sending password reset:', err);
      setError('Failed to send password reset email');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-8 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 sm:p-8"
        >
          <div className="flex items-center gap-6 mb-8">
            <div className="relative group">
              <img
                src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`}
                alt={profile?.full_name || 'Profile'}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white shadow-lg"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {uploadingPhoto ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
              </button>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{profile?.full_name}</h1>
              <p className="text-gray-600">{user?.email}</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700">
              <Save className="w-5 h-5" />
              <p>Profile updated successfully!</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  University
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={formData.university}
                    onChange={(e) => setFormData(prev => ({ ...prev, university: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                About
              </label>
              <textarea
                value={formData.about}
                onChange={(e) => setFormData(prev => ({ ...prev, about: e.target.value }))}
                rows={4}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPasswordReset(true)}
                className="w-full sm:w-auto px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:ring-4 focus:ring-gray-500/50 transition-colors flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4" />
                <span>Reset Password</span>
              </button>
            </div>
          </form>

          {showPasswordReset && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h3 className="text-lg font-semibold mb-4">Reset Password</h3>
                {!passwordResetSent ? (
                  <>
                    <p className="text-gray-600 mb-6">
                      We'll send a password reset link to your email address.
                    </p>
                    <div className="flex justify-end gap-4">
                      <button
                        onClick={() => setShowPasswordReset(false)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handlePasswordReset}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Send Reset Link
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-gray-600 mb-6">
                      Password reset link has been sent to your email.
                    </p>
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          setShowPasswordReset(false);
                          setPasswordResetSent(false);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Close
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}