import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Header from '../Header';
import AdLocker from '../AdLocker';
import { useAppStore } from '../../lib/store';

export default function MainLayout() {
  const location = useLocation();
  const isPromoter = location.pathname.startsWith('/promoter');
  const isCreatorPage = location.pathname.startsWith('/creator');
  
  const { showVerification, verificationTarget, verificationClosable, triggerVerification, closeVerification, isVerified } = useAppStore();

  // Auto-show the verification modal on initial load if not verified, with a close button
  useEffect(() => {
     if (!isPromoter && !isVerified) {
        const target = isCreatorPage ? 'creator' : 'website';
        triggerVerification(target, true);
     }
  }, [isPromoter]); // Runs once when layout mounts

  // Do not show full-page locker on the Promoter dashboard, 
  // they only get the embedded one on app upload.
  const showLocker = !isPromoter && showVerification;

  return (
    <div className="min-h-screen flex flex-col selection:bg-primary selection:text-white pb-safe">
      <Header />
      <main className="flex-1 w-full max-w-screen-2xl mx-auto min-h-[50vh] relative">
        <Outlet />
      </main>
      
      {showLocker && (
         <AdLocker 
            target={verificationTarget} 
            closable={verificationClosable} 
            onClose={closeVerification} 
            onUnlock={closeVerification}
         />
      )}
    </div>
  );
}
