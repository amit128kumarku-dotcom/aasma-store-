import React, { useEffect, useState } from 'react';

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 bg-[#111] border border-white/10 rounded-2xl p-4 shadow-2xl z-50 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-5">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
        <div>
          <h3 className="text-white font-bold text-sm">Install App</h3>
          <p className="text-zinc-400 text-xs mt-0.5">Add to your home screen for quick access</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setShowBanner(false)}
          className="p-2 text-zinc-500 hover:text-white transition-colors"
        >
          ✕
        </button>
        <button
          onClick={handleInstallClick}
          className="px-4 py-2 bg-white text-black font-bold rounded-xl text-sm transition-transform hover:scale-105 active:scale-95"
        >
          Install
        </button>
      </div>
    </div>
  );
}
