import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, AlertCircle, LogIn } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { logSecurityEvent } from '../lib/security';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Strict admin login validation
      if (email !== 'admin@mctlabs.tech') {
        await logSecurityEvent('INVALID_ADMIN_EMAIL_ATTEMPT', null, { 
          attemptedEmail: email,
          ipAddress: await getUserIP(),
          userAgent: navigator.userAgent
        });
        throw new Error('Invalid admin credentials');
      }

      // Sign in with Firebase
      const { user: signedInUser } = await signInWithEmailAndPassword(auth, email, password);
      
      // Verify admin status in database
      const profileRef = doc(db, 'profiles', signedInUser.uid);
      const profileSnap = await getDoc(profileRef);
      
      if (!profileSnap.exists()) {
        // Create admin profile if it doesn't exist
        await setDoc(profileRef, {
          email: signedInUser.email,
          full_name: 'Administrator',
          isAdmin: true,
          university: 'Daffodil International University',
          department: 'MCT',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      } else {
        const profileData = profileSnap.data();
        if (!profileData.isAdmin) {
          await logSecurityEvent('NON_ADMIN_USER_ADMIN_LOGIN_ATTEMPT', signedInUser);
          throw new Error('Access denied: Admin privileges required');
        }
      }

      // Set custom claims for admin user (this would typically be done server-side)
      // For now, we'll rely on the profile data
      
      await logSecurityEvent('ADMIN_LOGIN_SUCCESS', signedInUser);
      navigate('/admin-dashboard');
    } catch (err: any) {
      console.error('Admin login error:', err);
      
      // Log failed login attempts
      await logSecurityEvent('LOGIN_FAILED', null, { 
        email, 
        error: err.message,
        isAdminLogin: true 
      });
      
      setError(err.message || 'Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  };

  const getUserIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch {
      return 'unknown';
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="w-full max-w-md"
      >
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              MCT Labs Admin
            </h1>
            <p className="text-gray-300">
              Secure Administrative Access
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Authentication Failed</p>
                <p className="text-sm">{error}</p>
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Admin Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-400 backdrop-blur-sm"
                placeholder="Enter admin email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-400 backdrop-blur-sm"
                placeholder="Enter admin password"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Access Admin Panel</span>
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">
              Authorized personnel only. All access is logged and monitored.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}