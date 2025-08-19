import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn, AlertCircle, UserPlus, Mail, User, Building2, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';

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

interface LoginProps {
  adminLogin?: boolean;
}

export default function Login({ adminLogin = false }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('MCT');
  const [university, setUniversity] = useState('Daffodil International University');
  const [batch, setBatch] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();

  const validateDIUEmail = (email: string): { isValid: boolean; studentId?: string } => {
    const emailRegex = /^.*-40-(\d{3})@diu\.edu\.bd$/i;
    const match = email.toLowerCase().match(emailRegex);
    
    if (match) {
      return { isValid: true, studentId: `40-${match[1]}` };
    }
    
    return { isValid: false };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError('');
      setSuccess('');
      setLoading(true);

      if (adminLogin) {
        // Admin login - you can implement this separately if needed
        throw new Error('Admin login not implemented with Firebase');
      } else if (isSignUp) {
        // Sign up validation
        const emailValidation = validateDIUEmail(email);
        if (!emailValidation.isValid) {
          throw new Error('Only Educational emails For MCT students are allowed');
        }
        
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }
        
        if (!fullName.trim()) {
          throw new Error('Full name is required');
        }
        
        if (!batch.trim()) {
          throw new Error('Batch is required');
        }

        // Create user with Firebase
        const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
        
        // Update user profile with display name and additional metadata
        await updateProfile(newUser, {
          displayName: fullName,
        });
        
        // Send email verification
        await sendEmailVerification(newUser);
        
        setSuccess('Account created successfully! Please check your inbox / spam mails to verify your account before signing in.');
        setIsSignUp(false);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setFullName('');
        setStudentId('');
        setBatch('');
      } else {
        // Sign in
        const { user: signedInUser } = await signInWithEmailAndPassword(auth, email, password);
        
        // Check if email is verified
        if (!signedInUser.emailVerified) {
          throw new Error('Please verify your email before signing in. Check your inbox / spam for the verification link.');
        }
        
        navigate('/');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Handle specific Firebase auth errors with user-friendly messages
      let errorMessage = 'An error occurred. Please try again.';
      
      if (err.code) {
        switch (err.code) {
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email address. Please register first or check your email.';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Invalid password. Please check your password and try again.';
            break;
          case 'auth/invalid-credential':
            errorMessage = 'Invalid email or password. Please check your credentials and try again.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled. Please contact support.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed login attempts. Please try again later.';
            break;
          case 'auth/email-already-in-use':
            errorMessage = 'An account with this email already exists. Please sign in instead.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password is too weak. Please choose a stronger password.';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'Email/password accounts are not enabled. Please contact support.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your internet connection and try again.';
            break;
          default:
            errorMessage = err.message || 'An error occurred. Please try again.';
        }
      } else {
        errorMessage = err.message || 'An error occurred. Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-16 pb-8 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-6 max-w-md relative">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-8 relative overflow-hidden"
        >
          {/* Beta Badge */}
          <div className="absolute top-4 right-4 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
            BETA
          </div>

          <motion.div variants={fadeIn} className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {adminLogin ? 'Admin Login' : isSignUp ? 'Join MCT Labs' : 'Welcome Back'}
            </h1>
            <p className="text-gray-600 mt-2">
              {adminLogin 
                ? 'Sign in to admin dashboard' 
                : isSignUp 
                  ? 'Create your account to get started'
                  : 'Sign in to MCT Labs'
              }
            </p>
            {isSignUp && (
              <p className="text-sm text-orange-600 mt-2 flex items-center justify-center gap-1">
                <Mail className="w-4 h-4" />
                (DIU students only - Format: yourname-40-xxx@diu.edu.bd)
              </p>
            )}
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200 text-red-700 rounded-lg flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-green-50/80 backdrop-blur-sm border border-green-200 text-green-700 rounded-lg flex items-start gap-3"
            >
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-medium">Success!</p>
                <p className="text-sm">{success}</p>
                <p className="text-sm mt-1">Note: You must verify your email before you can sign in.</p>
              </div>
            </motion.div>
          )}

          <motion.form
            variants={staggerContainer}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {isSignUp && !adminLogin && (
              <motion.div variants={fadeIn}>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
                    placeholder="Enter your full name"
                  />
                </div>
              </motion.div>
            )}

            {isSignUp && !adminLogin && (
              <motion.div variants={fadeIn}>
                <label htmlFor="university" className="block text-sm font-medium text-gray-700 mb-1">
                  University
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    id="university"
                    required
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200 appearance-none"
                  >
                    <option value="Daffodil International University">Daffodil International University</option>
                  </select>
                </div>
              </motion.div>
            )}

            {isSignUp && !adminLogin && (
              <motion.div variants={fadeIn}>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    id="department"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200 appearance-none"
                  >
                    <option value="MCT">Multimedia and Creative Technology (MCT)</option>
                  </select>
                </div>
              </motion.div>
            )}

            {isSignUp && !adminLogin && (
              <motion.div variants={fadeIn}>
                <label htmlFor="batch" className="block text-sm font-medium text-gray-700 mb-1">
                  Batch
                </label>
                <input
                  id="batch"
                  type="text"
                  required
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
                  placeholder="e.g., 58th, 59th, 60th"
                />
              </motion.div>
            )}

            <motion.div variants={fadeIn}>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                {adminLogin ? 'Username' : 'Email Address'}
              </label>
              <input
                id="email"
                type={adminLogin ? 'text' : 'email'}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
                placeholder={adminLogin ? 'Enter admin username' : isSignUp ? 'yourname-40-123@diu.edu.bd' : 'Enter your email'}
              />
            </motion.div>

            <motion.div variants={fadeIn}>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
                placeholder={adminLogin ? 'Enter admin password' : isSignUp ? 'Create a password (min 6 characters)' : 'Enter your password'}
              />
            </motion.div>

            {isSignUp && !adminLogin && (
              <motion.div variants={fadeIn}>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
                  placeholder="Confirm your password"
                />
              </motion.div>
            )}

            <motion.button
              variants={fadeIn}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSignUp ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
              <span>
                {loading 
                  ? (isSignUp ? 'Creating Account...' : 'Signing in...') 
                  : (isSignUp ? 'Create Account' : 'Sign In')
                }
              </span>
            </motion.button>
          </motion.form>

          {!adminLogin && (
            <motion.div variants={fadeIn} className="mt-6 text-center">
              <p className="text-gray-600">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </p>
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setSuccess('');
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                  setFullName('');
                  setStudentId('');
                  setBatch('');
                }}
                className="mt-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                {isSignUp ? 'Sign in here' : 'Create an account'}
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}