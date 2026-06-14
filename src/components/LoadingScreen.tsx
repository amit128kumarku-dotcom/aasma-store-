import React from 'react';
import { useAppStore } from '../lib/store';

export default function LoadingScreen() {
  const { settings } = useAppStore();
  
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/20 blur-[100px] rounded-full pointer-events-none"></div>
      
       <div className="flex flex-col items-center relative z-10 animate-in fade-in zoom-in duration-500">
         <div className="relative w-24 h-24 mb-8">
           {/* Outer spinning ring */}
           <div className="absolute inset-0 border-4 border-white/5 rounded-3xl"></div>
           <div className="absolute inset-0 border-4 border-primary rounded-3xl border-t-transparent border-l-transparent animate-spin shadow-[0_0_15px_rgba(var(--primary),0.5)]"></div>
           
           {/* Center Logo */}
           <div className="absolute inset-0 flex items-center justify-center">
             {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-12 h-12 rounded-xl object-contain bg-white/5 p-1 animate-pulse" />
             ) : (
                <div className="w-14 h-14 rounded-xl bg-white text-black flex items-center justify-center font-extrabold text-3xl shadow-[0_0_20px_rgba(255,255,255,0.2)] animate-pulse">
                  A
                </div>
             )}
           </div>
         </div>
         
         <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            {settings?.websiteName || 'Aasma Store'}
         </h2>
         
         <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
           <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
           <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
           <span className="ml-2 text-zinc-400 font-medium text-sm tracking-wide">Loading awesome apps...</span>
         </div>
       </div>
    </div>
  );
}
