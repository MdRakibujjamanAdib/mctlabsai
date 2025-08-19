import React, { useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { MessageSquare, ImagePlus, Music, Video, Box, Gamepad, Menu, X, Home as HomeIcon, LogOut, Code, Bot, User, Settings } from 'lucide-react';
import { initializeSecurity, logSecurityEvent } from './lib/security';
import AdminRoute from './components/AdminRoute';
import { SecurityProvider } from './components/SecurityProvider';
import { useSecureAuth } from './hooks/useSecureAuth';
import HomePage from './pages/Home';
import Chat from './pages/Chat';
import Coder from './pages/Coder';
import ImageGen from './pages/ImageGen';
import Tuner from './pages/Tuner';
import Animation from './pages/Animation';
import ThreeDPage from './pages/3D';
import Build from './pages/Build';
import Echo from './pages/Echo';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Plans from './pages/Plans';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Initialize security measures
initializeSecurity();

function PrivateRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, authorized, loading } = useSecureAuth({ 
    requiredRole: adminOnly ? 'admin' : 'student' 
  });
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!user || !authorized) {
    return <Navigate to="/login" />;
  }


  return <>{children}</>;
}

function Navigation() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      await logSecurityEvent('USER_LOGOUT', user);
      await signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Don't show navigation on admin login page
  if (location.pathname === '/loginasadib') {
    return null;
  }

  return (
    <header className="fixed w-full z-50 top-0 left-0 right-0 bg-white/80 backdrop-blur-lg shadow-sm">
      <div className="h-[8vh] max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-full">
          {/* Logo and primary navigation */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <img 
                src="/logo.svg" 
                alt="MCT Labs Logo" 
                className="h-6 sm:h-8 w-auto"
              />
              <span className="text-lg font-semibold bg-gradient-to-r from-[#FF2CDF] to-[#0014FF] bg-clip-text text-transparent">
                MCT Labs
              </span>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <NavLink to="/" icon={<HomeIcon className="w-4 h-4" />} current={location.pathname}>
                Home
              </NavLink>
              <NavLink to="/chat" icon={<MessageSquare className="w-4 h-4" />} current={location.pathname}>
                Chat
              </NavLink>
              <NavLink to="/coder" icon={<Code className="w-4 h-4" />} current={location.pathname}>
                Coder
              </NavLink>
              <NavLink to="/image-generator" icon={<ImagePlus className="w-4 h-4" />} current={location.pathname}>
                Canvas
              </NavLink>
              <NavLink to="/tuner" icon={<Music className="w-4 h-4" />} current={location.pathname}>
                Tuner
              </NavLink>
              <NavLink to="/echo" icon={<Bot className="w-4 h-4" />} current={location.pathname}>
                Echo
              </NavLink>
              <NavLink to="/animation-generator" icon={<Video className="w-4 h-4" />} current={location.pathname}>
                Animation
              </NavLink>
              <NavLink to="/3d" icon={<Box className="w-4 h-4" />} current={location.pathname}>
                3D
              </NavLink>
              <NavLink to="/build" icon={<Gamepad className="w-4 h-4" />} current={location.pathname}>
                Build
              </NavLink>
            </nav>
          </div>

          {/* User actions */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {user.user_metadata?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="hidden md:inline-flex items-center justify-center rounded-full p-2 text-gray-500 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    title="Admin Dashboard"
                  >
                    <Settings className="w-5 h-5" />
                  </Link>
                )}
                <Link
                  to="/profile"
                  className="hidden md:inline-flex items-center justify-center rounded-full p-2 text-gray-500 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  title="Profile"
                >
                  <User className="w-5 h-5" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="hidden md:inline-flex items-center justify-center rounded-full p-2 text-gray-500 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
                {/* Mobile menu button */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden inline-flex items-center justify-center rounded-full p-2 text-gray-500 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  {isMobileMenuOpen ? (
                    <X className="w-6 h-6" />
                  ) : (
                    <Menu className="w-6 h-6" />
                  )}
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-full text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-lg border-t">
          <nav className="px-4 py-3 space-y-1">
            <MobileNavLink to="/" icon={<HomeIcon className="w-5 h-5" />} current={location.pathname} onClick={closeMobileMenu}>
              Home
            </MobileNavLink>
            <MobileNavLink to="/chat" icon={<MessageSquare className="w-5 h-5" />} current={location.pathname} onClick={closeMobileMenu}>
              Chat
            </MobileNavLink>
            <MobileNavLink to="/coder" icon={<Code className="w-5 h-5" />} current={location.pathname} onClick={closeMobileMenu}>
              Coder
            </MobileNavLink>
            <MobileNavLink to="/image-generator" icon={<ImagePlus className="w-5 h-5" />} current={location.pathname} onClick={closeMobileMenu}>
              Canvas
            </MobileNavLink>
            <MobileNavLink to="/tuner" icon={<Music className="w-5 h-5" />} current={location.pathname} onClick={closeMobileMenu}>
              Tuner
            </MobileNavLink>
            <MobileNavLink to="/echo" icon={<Bot className="w-5 h-5" />} current={location.pathname} onClick={closeMobileMenu}>
              Echo
            </MobileNavLink>
            <MobileNavLink to="/animation-generator" icon={<Video className="w-5 h-5" />} current={location.pathname} onClick={closeMobileMenu}>
              Animation
            </MobileNavLink>
            <MobileNavLink to="/3d" icon={<Box className="w-5 h-5" />} current={location.pathname} onClick={closeMobileMenu}>
              3D
            </MobileNavLink>
            <MobileNavLink to="/build" icon={<Gamepad className="w-5 h-5" />} current={location.pathname} onClick={closeMobileMenu}>
              Build
            </MobileNavLink>
            {user && (
              <>
                {user.user_metadata?.role === 'admin' && (
                  <MobileNavLink to="/admin" icon={<Settings className="w-5 h-5" />} current={location.pathname} onClick={closeMobileMenu}>
                    Admin Dashboard
                  </MobileNavLink>
                )}
                <MobileNavLink to="/profile" icon={<User className="w-5 h-5" />} current={location.pathname} onClick={closeMobileMenu}>
                  Profile
                </MobileNavLink>
                <button
                  onClick={() => {
                    handleLogout();
                    closeMobileMenu();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function NavLink({ to, children, icon, current }: { to: string; children: React.ReactNode; icon: React.ReactNode; current: string }) {
  const isActive = current === to;
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
        isActive 
          ? 'bg-gray-100 text-blue-600 font-medium' 
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}

function MobileNavLink({ to, children, icon, current, onClick }: { to: string; children: React.ReactNode; icon: React.ReactNode; current: string; onClick: () => void }) {
  const isActive = current === to;
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
        isActive 
          ? ' bg-gray-100 text-blue-600 font-medium' 
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  
  useEffect(() => {
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.scrollTop = 0;
    }
  }, [pathname]);

  return null;
}

function Footer() {
  return (
    <footer className="w-full py-2 relative">
      <div className="absolute inset-x-0 top-0 h-0 bg-gradient-to-b from-transparent to-white/10" />
      <div className=" relative bg-white/5 backdrop-blur-sm">
        <p className="text-xs text-gray-400">
          © 2025 MCT Labs. All rights reserved | by{' '}
          <a 
            href="https://bd.linkedin.com/in/md-rakibujjaman-adib" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-blue-600 transition-colors"
          >
            Md Rakibujjaman Adib
          </a>
        </p>
      </div>
    </footer>
  );
}

function App() {
  return (
    <AuthProvider>
      <SecurityProvider>
        <div className="responsive-container animate-background">
          <Navigation />
          <ScrollToTop />
          <main className="md:mt-16 mt-12">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/loginasadib" element={<AdminLogin />} />
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              <Route 
                path="/chat" 
                element={
                  <PrivateRoute>
                    <Chat />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/coder" 
                element={
                  <PrivateRoute>
                    <Coder />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/image-generator" 
                element={
                  <PrivateRoute>
                    <ImageGen />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/tuner" 
                element={
                  <PrivateRoute>
                    <Tuner />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/echo" 
                element={
                  <PrivateRoute>
                    <Echo />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/animation-generator" 
                element={
                  <PrivateRoute>
                    <Animation />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/3d" 
                element={
                  <PrivateRoute>
                    <ThreeDPage />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/build" 
                element={
                  <PrivateRoute>
                    <Build />
                  </PrivateRoute>
                } 
              />
              <Route
                path="/profile"
                element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <Admin />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin-dashboard"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/plans"
                element={
                  <PrivateRoute>
                    <Plans />
                  </PrivateRoute>
                }
              />
            </Routes>
          </main>
          <Footer />
        </div>
      </SecurityProvider>
    </AuthProvider>
  );
}

export default App;