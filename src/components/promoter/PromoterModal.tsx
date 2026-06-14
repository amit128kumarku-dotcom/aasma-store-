import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp, query, collection, where, getDocs } from 'firebase/firestore';
// import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '../../lib/firebase';
import { useAppStore } from '../../lib/store';
import { cn } from '../../lib/utils';
import { User, MapPin, Link as LinkIcon, AtSign, Loader2, X, CheckCircle2 } from 'lucide-react';

interface PromoterModalProps {
  onClose: () => void;
}

export default function PromoterModal({ onClose }: PromoterModalProps) {
  const { settings } = useAppStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'code' | 'details' | 'username'>('code');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [socialLink, setSocialLink] = useState('');
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  const correctCode = settings?.promoterSecretCode || 'amitkumar';

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code !== correctCode) {
      setError('Invalid Access Code');
      return;
    }
    setError('');
    setLoading(true);

    try {
      let uid = localStorage.getItem('promoter_uid');
      if (!uid) {
        setMode('details');
        setLoading(false);
        return;
      }

      const docRef = doc(db, 'promoters', uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        onClose();
        navigate('/promoter');
      } else {
        setMode('details');
      }
    } catch (err: any) {
      console.error(err);
      setError('Connection failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateUsername = (nameSnippet: string) => {
    const base = nameSnippet.toLowerCase().replace(/[^a-z0-9]/g, '');
    const rand = Math.floor(100 + Math.random() * 900);
    return `${base}${rand}`;
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !area) {
      setError('Please fill in required details');
      return;
    }
    setUsername(generateUsername(name));
    setMode('username');
    checkUsernameAvailability(generateUsername(name));
  };

  const checkUsernameAvailability = async (u: string) => {
    if (u.length < 3) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'promoters'), where('username', '==', u));
      const querySnapshot = await getDocs(q);
      setUsernameAvailable(querySnapshot.empty);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameChange = (newVal: string) => {
    const cleaned = newVal.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleaned);
    setUsernameAvailable(null);
    if (cleaned.length >= 3) {
      checkUsernameAvailability(cleaned);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameAvailable) return;
    setLoading(true);
    try {
      let uid = localStorage.getItem('promoter_uid');
      if (!uid) {
        uid = 'promoter_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('promoter_uid', uid);
      }

      await setDoc(doc(db, 'promoters', uid), {
        uid,
        name,
        area,
        socialLink,
        username,
        totalLinks: 0,
        totalViews: 0,
        successfulConversions: 0,
        createdAt: serverTimestamp(),
      });

      onClose();
      navigate('/promoter');
    } catch (err) {
      console.error(err);
      setError('Failed to create account.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          {mode === 'code' && (
            <form onSubmit={handleCodeSubmit} className="flex flex-col gap-5">
              <div className="text-center mb-2">
                <h2 className="text-2xl font-bold text-white mb-2">Promoter Login</h2>
                <p className="text-zinc-400 text-sm">Enter your secret access code</p>
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Secret Code"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-center tracking-[0.2em] font-mono text-lg"
                  autoFocus
                />
              </div>
              {error && <div className="text-red-500 text-sm text-center font-medium bg-red-500/10 py-2 rounded-lg">{error}</div>}
              <button 
                type="submit" 
                disabled={loading || !code}
                className="w-full bg-white text-black font-bold text-lg rounded-xl py-3 mt-2 disabled:opacity-50 hover:bg-zinc-200 transition-colors flex justify-center items-center h-[52px]"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Access Dashboard'}
              </button>
            </form>
          )}

          {mode === 'details' && (
            <form onSubmit={handleDetailsSubmit} className="flex flex-col gap-4 animate-in slide-in-from-right-4">
              <div className="mb-2">
                <h2 className="text-xl font-bold text-white mb-1">Welcome Promoter!</h2>
                <p className="text-zinc-400 text-sm">Let\'s get your profile set up.</p>
              </div>
              
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
              
              <div className="relative group">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  required
                  placeholder="Area / City"
                  value={area}
                  onChange={e => setArea(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>

              <div className="relative group">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                <input
                  type="url"
                  placeholder="Social Media Link (Optional)"
                  value={socialLink}
                  onChange={e => setSocialLink(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>

              {error && <div className="text-red-500 text-sm font-medium">{error}</div>}
              
              <button 
                type="submit" 
                className="w-full bg-gradient-btn text-white font-bold text-[15px] rounded-xl py-3 mt-4 hover:shadow-lg transition-all"
              >
                Continue
              </button>
            </form>
          )}

          {mode === 'username' && (
            <form onSubmit={handleCreateAccount} className="flex flex-col gap-5 animate-in slide-in-from-right-4">
               <div className="mb-2 text-center">
                <h2 className="text-xl font-bold text-white mb-1">Choose Username</h2>
                <p className="text-zinc-400 text-sm px-4">This will be used in your referral links.</p>
              </div>

              <div className="relative group">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  required
                  placeholder="username"
                  value={username}
                  onChange={e => handleUsernameChange(e.target.value)}
                  className={cn(
                    "w-full bg-black border rounded-xl pl-11 pr-11 py-3 text-white focus:outline-none focus:ring-2 transition-all font-medium",
                    usernameAvailable === true ? "border-green-500/50 focus:ring-green-500/50" : 
                    usernameAvailable === false ? "border-red-500/50 focus:ring-red-500/50" : 
                    "border-white/10 focus:ring-primary/50"
                  )}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin text-zinc-500" /> : 
                   usernameAvailable === true ? <CheckCircle2 className="w-5 h-5 text-green-500" /> :
                   usernameAvailable === false ? <X className="w-5 h-5 text-red-500" /> : null}
                </div>
              </div>

              {usernameAvailable === false && (
                <p className="text-red-400 text-sm text-center font-medium">Username is already taken.</p>
              )}
              {usernameAvailable === true && (
                <p className="text-green-400 text-sm text-center font-medium opacity-80">Username is available!</p>
              )}

              {error && <div className="text-red-500 text-sm text-center font-medium">{error}</div>}

              <button 
                type="submit" 
                disabled={loading || !usernameAvailable || username.length < 3}
                className="w-full bg-primary text-primary-foreground font-bold text-[15px] rounded-xl py-3 mt-2 disabled:opacity-50 hover:bg-primary/90 transition-all flex items-center justify-center h-[52px] shadow-[0_0_20px_rgba(var(--color-primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--color-primary),0.5)]"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
