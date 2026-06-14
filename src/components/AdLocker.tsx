import React, { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, where, getDocs, Timestamp, doc, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Lock, ExternalLink, Loader2, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Zap, DownloadCloud, Timer, Trophy, Flame, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppStore } from '../lib/store';

interface AdLockerProps {
  target: 'website' | 'creator' | 'downloads' | string;
  onUnlock?: () => void;
  // If embedded is true, it renders inside its container instead of a fixed full-screen overlay
  embedded?: boolean; 
  closable?: boolean;
  onClose?: () => void;
  frequency?: 'daily' | 'always';
}

export default function AdLocker({ target, onUnlock, embedded = false, closable = false, onClose, frequency = 'daily' }: AdLockerProps) {
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [ad, setAd] = useState<any>(null);
  
  // States: 'choosing' | 'idle' | 'waiting' | 'validating' | 'success' | 'failed'
  const [status, setStatus] = useState<'choosing' | 'idle' | 'waiting' | 'validating' | 'success' | 'failed'>('choosing');
  
  const MIN_WAIT_MS = 35000; // 35 seconds
  const storageKey = `ad_unlock_${target}_ts`;
  const streakKey = `ad_unlock_streak`;

  const [streak, setStreak] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastUnlockTime, setLastUnlockTime] = useState<number | null>(null);

  const { setIsVerified, showSuccessIfVerified } = useAppStore();

  // Use refs to prevent stale closures in event listeners
  const statusRef = useRef(status);
  const clickTimeRef = useRef<number | null>(null);
  const adRef = useRef<any>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    adRef.current = ad;
  }, [ad]);
  
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    const checkStatus = async () => {
      // Check streak
      const storedStreak = localStorage.getItem(streakKey);
      if (storedStreak) {
        try {
          const parsed = JSON.parse(storedStreak);
          const now = Date.now();
          const oneDay = 24 * 60 * 60 * 1000;
          if (now - parsed.lastUnlock <= 2 * oneDay) {
            setStreak(parsed.streak);
            setLastUnlockTime(parsed.lastUnlock);
          } else {
            setStreak(0);
          }
        } catch(e) {}
      }

      // Check calendar day unlock for daily frequency
      if (frequency === 'daily') {
        const lastUnlock = localStorage.getItem(storageKey);
        if (lastUnlock) {
          const timestamp = parseInt(lastUnlock, 10);
          setLastUnlockTime(timestamp);
          
          const lastDate = new Date(timestamp).toDateString();
          const todayDate = new Date().toDateString();
          
          if (lastDate === todayDate) {
            // Unlocked today
            setIsVerified(true);
            if (showSuccessIfVerified) {
               // Show them their success streak if manually triggered
               setIsLocked(true);
               setStatus('success');
               setTimeout(() => {
                 setIsLocked(false);
                 if (onUnlock) onUnlock();
               }, 3000); // Auto-dismiss after 3s
               return;
            } else {
               // Bypass completely on initial load or if strictly forced elsewhere
               if (onUnlock) onUnlock();
               return; 
            }
          }
        }
      }

      // Fetch active ads
      const q = query(
        collection(db, 'ads'), 
        where('target', '==', target)
      );
      
      try {
        const snap = await getDocs(q);
        const now = new Date();
        const activeAds = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((a: any) => !a.expiresAt || a.expiresAt.toDate() > now);

        if (activeAds.length > 0) {
          // Randomize or cycle
          const randomIndex = Math.floor(Math.random() * activeAds.length);
          setAd(activeAds[randomIndex]);
          setIsLocked(true);
          setStatus('idle');
          setIsVerified(false);
        } else {
          // No active ads, bypass the lock
          setIsVerified(true);
          if (onUnlock) onUnlock();
        }
      } catch (e) {
        console.error("Failed to load ads", e);
        // On error, let them through to not break the site
        setIsVerified(true);
        if (onUnlock) onUnlock();
      }
    };
    
    checkStatus();
  }, [target, storageKey, onUnlock, showSuccessIfVerified]);

  useEffect(() => {
    const handleReturn = () => {
      if (statusRef.current !== 'waiting' || !clickTimeRef.current || !adRef.current) return;
      
      const elapsed = Date.now() - clickTimeRef.current;
      
      // Ignore rapid phantom events triggered by window.open when the ad is clicked
      if (elapsed < 3000) return;
      
      statusRef.current = 'validating'; // Prevent duplicate triggers sync
      const currentAd = adRef.current;
      const currentSessionId = sessionIdRef.current;
      setStatus('validating');
      
      // Artificial delay for better real-time "analyzing" UX
      setTimeout(async () => {
        if (elapsed >= MIN_WAIT_MS) {
          // Success
          setStatus('success');
          
          let newStreak = streak + 1;
          
          // ALWAYS update storage and global verified state so the site stays open
          localStorage.setItem(storageKey, Date.now().toString());
          localStorage.setItem(streakKey, JSON.stringify({ streak: newStreak, lastUnlock: Date.now() }));
          setStreak(newStreak);
          setIsVerified(true);
          
          // Track success
          try {
            await updateDoc(doc(db, 'ads', currentAd.id), {
              success: increment(1)
            });
            if (currentSessionId) {
               await updateDoc(doc(db, 'verification_sessions', currentSessionId), {
                 endTime: serverTimestamp(),
                 durationMs: elapsed,
                 status: 'success'
               });
            }
          } catch (e) { console.error(e); }

          setTimeout(() => {
            setIsLocked(false);
            if (onUnlock) onUnlock();
          }, 2000); // Wait 2s to show success state before hiding
        } else {
          // Failed
          setStatus('failed');
          
          // Track failed
          try {
            await updateDoc(doc(db, 'ads', currentAd.id), {
              failed: increment(1)
            });
            if (currentSessionId) {
               await updateDoc(doc(db, 'verification_sessions', currentSessionId), {
                 endTime: serverTimestamp(),
                 durationMs: elapsed,
                 status: 'failed'
               });
            }
          } catch (e) { console.error(e); }
        }
      }, 2500); // 2.5 second mock loading while tracking evaluates
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleReturn();
      }
    };
    
    const onFocus = () => {
      if (document.hasFocus()) {
        handleReturn();
      }
    };

    window.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', handleReturn);
    
    return () => {
      window.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', handleReturn);
    };
  }, [MIN_WAIT_MS, frequency, onUnlock, storageKey, streakKey, streak]);

  const handleActionClick = async () => {
    clickTimeRef.current = Date.now();
    setStatus('waiting');
    window.open(ad.link, '_blank');
    
    // Track click
    if (ad) {
      try {
        await updateDoc(doc(db, 'ads', ad.id), {
          clicks: increment(1)
        });
        
        try {
          const docRef = await addDoc(collection(db, 'verification_sessions'), {
              target: target,
              adId: ad.id,
              userId: auth.currentUser?.uid || 'anonymous',
              status: 'started',
              startTime: serverTimestamp(),
              userAgent: navigator.userAgent || 'unknown',
              requiredDurationMs: MIN_WAIT_MS
          });
          setSessionId(docRef.id);
        } catch(e) { console.error("Session creation failed", e); }
        
      } catch (e) { console.error(e); }
    }
  };

  if (!isLocked || status === 'choosing' || (!ad && status !== 'success')) return null;

  const featureDetails = () => {
    if (target === 'creator') {
      return { 
        title: 'Creator Dashboard Access', 
        desc: 'Verify to unlock creator tools and app upload permissions.',
        icon: <Zap className="w-6 h-6 text-primary" />,
        badge: 'Platform Capability'
      };
    }
    return { 
      title: 'Free App Downloads', 
      desc: 'Complete verification to unlock premium content and features.',
      icon: <DownloadCloud className="w-6 h-6 text-green-500" />,
      badge: 'Premium Access'
    };
  };

  const details = featureDetails();

  const content = (
    <div className="w-full max-w-[400px] mx-auto bg-gradient-to-b from-[#222] to-[#111] p-1 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10">
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
      
      {/* Target-specific subtle background glow */}
      <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 blur-[60px] opacity-20 pointer-events-none", target === 'creator' ? 'bg-purple-500' : 'bg-primary')} />

      {closable && (
         <button onClick={onClose} className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-black/80 text-white/70 hover:text-white rounded-full transition-colors z-50 backdrop-blur-sm">
            <X className="w-4 h-4"/>
         </button>
      )}
      
      {/* Container */}
      <div className="bg-black/40 rounded-[1.4rem] overflow-hidden relative z-10">
        
        {/* Header / Stats */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent">
          <div className="flex items-center gap-2">
            <ShieldCheck className={cn("w-4 h-4", target === 'creator' ? 'text-purple-400' : 'text-primary')} />
            <span className="text-white font-bold text-xs tracking-wide">Daily Check-in</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-orange-500/20 to-red-500/10 rounded-xl border border-orange-500/20 shadow-inner">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-orange-500 font-extrabold text-[10px] uppercase tracking-wider">{streak} Day Streak</span>
            </div>
          </div>
        </div>

        {/* Feature Context */}
        <div className="p-5 md:p-6 flex flex-col items-center text-center">
          
          <div className="flex items-center justify-center gap-1.5 mb-5 w-full">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
               const isCompleted = streak >= day;
               const isToday = streak + 1 === day && status !== 'success';
               return (
                  <div key={day} className="flex flex-col items-center gap-1 flex-1">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] transition-all shadow-sm ring-2 ring-offset-2 ring-offset-[#151515]",
                      isCompleted ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white ring-orange-500/30" :
                      isToday ? "bg-white/10 text-white ring-primary/50" : 
                      "bg-white/5 text-zinc-600 ring-transparent"
                    )}>
                      {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : day}
                    </div>
                  </div>
               )
            })}
          </div>

          <div className={cn("w-14 h-14 rounded-2xl bg-gradient-to-br border border-white/10 flex items-center justify-center mb-3 shadow-inner", target === 'creator' ? 'from-purple-500/20 to-purple-500/5' : 'from-primary/20 to-primary/5')}>
            {details.icon}
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight mb-2">
            {details.title}
          </h2>
          <p className="text-zinc-400 text-xs md:text-sm leading-relaxed max-w-[280px] mb-5">
            {details.desc}
          </p>

          {/* Verification Status UI */}
          <div className="w-full">
            {status === 'success' ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 flex flex-col items-center animate-in slide-in-from-bottom-2 shadow-inner">
                <div className="w-14 h-14 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mb-3 animate-bounce">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-green-500 font-extrabold text-lg">Verification Complete</h3>
                <p className="text-green-400/80 text-xs mt-1 font-medium">Access granted for today.</p>
              </div>
            ) : status === 'validating' ? (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 flex flex-col items-center animate-in slide-in-from-bottom-2 shadow-inner">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                <h3 className="text-blue-500 font-extrabold text-lg">Analyzing Session...</h3>
                <p className="text-blue-400/80 text-xs mt-1">Verifying secure activity loop.</p>
              </div>
            ) : status === 'failed' ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex flex-col items-center shadow-inner">
                <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mb-3 animate-pulse">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-red-500 font-extrabold text-lg mb-1">Verification Failed</h3>
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 w-full mb-3">
                  <div className="flex justify-between items-center mb-1"><span className="text-[10px] uppercase text-zinc-500">Required Time</span> <span className="text-xs font-bold text-white">35 seconds</span></div>
                  <div className="flex justify-between items-center"><span className="text-[10px] uppercase text-zinc-500">Completed Time</span> <span className="text-xs font-bold text-red-400">Too fast</span></div>
                </div>
                <button 
                  onClick={handleActionClick}
                  className="w-full py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white font-bold rounded-xl transition-all shadow-lg active:scale-[0.98] text-sm"
                >
                  Retry Verification
                </button>
              </div>
            ) : status === 'waiting' ? (
              <div className="bg-white/5 border border-dashed border-white/20 rounded-2xl p-6 flex flex-col items-center shadow-inner relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                <Timer className="w-10 h-10 text-primary animate-bounce mb-3 relative z-10" />
                <h3 className="text-white font-extrabold text-lg relative z-10">Tracking in Progress</h3>
                <p className="text-zinc-400 text-xs mt-1.5 text-center max-w-[250px] relative z-10">Please stay on the verified sponsor page for at least <b className="text-white">35 seconds</b>. Return here when complete.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 text-left shadow-inner text-sm text-zinc-300 font-medium flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <Timer className="w-4 h-4 text-primary" />
                     <span>Time Required</span>
                  </div>
                  <span className="text-white font-bold">35 Seconds</span>
                </div>

                <button 
                  onClick={handleActionClick}
                  className="w-full py-4 mt-1 text-center bg-white hover:bg-zinc-200 text-black font-black rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] flex justify-center items-center gap-2 active:scale-[0.98]"
                >
                  <span className="text-base tracking-wide">{ad.buttonName || 'Start Verification'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div className="w-full flex items-center justify-center py-10 min-h-[400px]">
        {content}
      </div>
    );
  }

  // Full screen overlay for global locking
  return (
    <div className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
       {content}
    </div>
  );
}
