import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { useAppStore } from '../../lib/store';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function AdminLayout() {
  const { isAdmin } = useAppStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Simple SHA-256 hash function
  async function hashPassword(msg: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(msg);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const docRef = doc(db, 'admin_auth', 'config');
      const docSnap = await getDoc(docRef);

      const enteredHash = await hashPassword(password);

      if (docSnap.exists()) {
        if (docSnap.data().passwordHash === enteredHash) {
          setStep(2);
        } else {
          setError('Invalid password');
        }
      } else {
        // If no password is set yet, we allow setup using default password "admin123"
        // Wait, better to let them in with any password the very first time? No, let's hardcode first setup.
        if (password === 'admin123') {
          setStep(2);
        } else {
          setError('Pass "admin123" for first time setup');
        }
      }
    } catch (err) {
      setError('An error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      // Allow user to select their Google account
      const result = await signInWithPopup(auth, provider);
      
      const allowedEmails = ['jiamit134kumar@gmail.com', 'arun2kumarkushwaha@gmail.com'];
      if (!result.user.email || !allowedEmails.includes(result.user.email)) {
        await signOut(auth);
        setError('Unauthorized email address');
        setStep(1);
      } else {
        // First time setup - save the password hash if step 1 was "admin123" setting it up
        const docRef = doc(db, 'admin_auth', 'config');
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
           // We are in! Save the hash of 'admin123' so it's initialized
           const hash = await hashPassword('admin123');
           await setDoc(docRef, { passwordHash: hash });
        }
      }
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Close drawer on path change
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [window.location.pathname]);

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        {/* Admin Header */}
        <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-lg flex items-center justify-between px-4 sm:px-6 h-16">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 -ml-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <h2 className="font-bold text-lg hidden sm:block">Admin Panel</h2>
          </div>
          <Link to="/" className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors">
            View Live Site
          </Link>
        </header>

        {/* Drawer Overlay */}
        {isDrawerOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />
        )}

        {/* Slide-out Navigation Drawer */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0a0a] border-r border-white/10 shadow-2xl transform transition-transform duration-300 ease-in-out ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-4 border-b border-white/10 flex items-center justify-between h-16">
            <h2 className="font-bold text-lg text-white">Menu</h2>
            <button 
              onClick={() => setIsDrawerOpen(false)}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <nav className="p-4 flex flex-col gap-2 overflow-y-auto h-[calc(100vh-4rem)]">
            <Link to="/admin" onClick={() => setIsDrawerOpen(false)} className="p-3 hover:bg-white/5 rounded-xl text-sm font-medium text-zinc-300 hover:text-white transition-colors">Dashboard</Link>
            <Link to="/admin/ads" onClick={() => setIsDrawerOpen(false)} className="p-3 hover:bg-white/5 rounded-xl text-sm font-medium text-zinc-300 hover:text-white transition-colors flex items-center justify-between">
              <span>Create Ads</span>
              <span className="w-5 h-5 bg-white/10 flex items-center justify-center rounded-md text-xs font-bold">+</span>
            </Link>
            <Link to="/admin/apps" onClick={() => setIsDrawerOpen(false)} className="p-3 hover:bg-white/5 rounded-xl text-sm font-medium text-zinc-300 hover:text-white transition-colors">Apps</Link>
            <Link to="/admin/earning-apps" onClick={() => setIsDrawerOpen(false)} className="p-3 hover:bg-white/5 rounded-xl text-sm font-medium text-zinc-300 hover:text-white transition-colors">Earning Apps</Link>
            <Link to="/admin/products" onClick={() => setIsDrawerOpen(false)} className="p-3 hover:bg-white/5 rounded-xl text-sm font-medium text-zinc-300 hover:text-white transition-colors">Products</Link>
            <Link to="/admin/about" onClick={() => setIsDrawerOpen(false)} className="p-3 hover:bg-white/5 rounded-xl text-sm font-medium text-zinc-300 hover:text-white transition-colors">About Us</Link>
            <Link to="/admin/settings" onClick={() => setIsDrawerOpen(false)} className="p-3 hover:bg-white/5 rounded-xl text-sm font-medium text-zinc-300 hover:text-white transition-colors">Settings</Link>
            
            <div className="mt-auto pt-4 border-t border-white/10">
              <button 
                onClick={() => signOut(auth)}
                className="w-full p-3 text-left text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Log Out
              </button>
            </div>
          </nav>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    );
  }

  // Login Screen
  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-md bg-[#111] border border-white/10 p-8 rounded-2xl shadow-xl">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Admin Access</h1>
        <p className="text-zinc-400 text-sm mb-6 text-center">
          {step === 1 ? 'Step 1: Password Verification' : 'Step 2: Google Verification'}
        </p>

        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 text-red-500 text-sm rounded-lg text-center">{error}</div>}

        {step === 1 ? (
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
            <input
              type="password"
              placeholder="Enter Admin Password"
              className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Continue'}
            </button>
            <Link to="/" className="text-center text-sm text-zinc-500 hover:text-white mt-2">
              Back to Home
            </Link>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white text-black hover:bg-gray-100 font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
            <button
              onClick={() => setStep(1)}
              className="text-center text-sm text-zinc-500 hover:text-white"
            >
              Back to Password
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
