import { useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Flame } from 'lucide-react';
import { useAppStore } from '../lib/store';
import { cn } from '../lib/utils';
import PromoterModal from './promoter/PromoterModal';

export default function Header() {
  const { settings, setSearchOpen, triggerVerification, isVerified } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const currentTab = location.hash || '#apps';
  const isHomePage = location.pathname === '/';
  const isCreatorPage = location.pathname.startsWith('/creator');
  const isPromoter = location.pathname.startsWith('/promoter');
  
  const [showSecretModal, setShowSecretModal] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = () => {
    pressTimer.current = setTimeout(() => {
      setShowSecretModal(true);
    }, 1500); // 1.5 seconds long press
  };

  const handleTouchEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 backdrop-blur-xl bg-black/80 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isHomePage && (
            <button 
              onClick={() => navigate(-1)} 
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors focus:outline-none -ml-2"
              aria-label="Go back"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div 
            onTouchStart={handleTouchStart} 
            onTouchEnd={handleTouchEnd} 
            onMouseDown={handleTouchStart} 
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
            className="flex items-center gap-3 group cursor-pointer select-none"
            onClick={(e) => {
              if (!isHomePage) navigate('/');
            }}
          >
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-9 h-9 rounded-lg object-contain bg-white/5 p-1" draggable={false} />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-white text-black flex items-center justify-center font-bold text-lg shadow-sm">
                A
              </div>
            )}
            <span className="font-extrabold text-xl tracking-tight text-gradient group-hover:scale-[1.02] transition-transform">
              {settings?.websiteName || 'Aasma Store'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {!isPromoter && (
             <button 
                onClick={() => triggerVerification(isCreatorPage ? 'creator' : 'website', true, true)}
                className={cn(
                  "px-3 py-1.5 sm:px-4 sm:py-2 rounded-full flex items-center justify-center gap-1.5 transition-all focus:outline-none active:scale-95 shadow-sm border",
                  isVerified 
                    ? "bg-gradient-to-r from-green-500/10 to-emerald-500/5 hover:from-green-500/20 hover:to-emerald-500/10 text-green-500 border-green-500/20" 
                    : "bg-gradient-to-r from-orange-500/10 to-red-500/5 hover:from-orange-500/20 hover:to-red-500/10 text-orange-500 border-orange-500/20"
                )}
                title="Daily Check-in"
             >
                <Flame className={cn("w-4 h-4 sm:w-4 sm:h-4", isVerified ? "text-green-500" : "text-orange-500")} />
                <span className="text-[10px] sm:text-xs font-bold tracking-wider uppercase">Check-in</span>
             </button>
          )}

          {settings?.searchEnabled !== false && (
            <button
              onClick={() => setSearchOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
              aria-label="Search"
            >
              <Search className="w-5 h-5 text-zinc-300" />
            </button>
          )}
        </div>
      </div>
      
      {/* Navigation Bar - Only show on homepage */}
      {isHomePage && (
        <nav className="w-full border-t border-white/5 bg-black/40">
          <div className="max-w-3xl mx-auto px-4 w-full flex overflow-x-auto hide-scrollbar gap-6">
            <Link to="/#apps" className={cn("px-2 py-3.5 text-sm font-bold whitespace-nowrap transition-colors border-b-2 focus:outline-none", currentTab === '#apps' ? "border-primary text-primary" : "border-transparent text-zinc-400 hover:text-white")}>
              Apps
            </Link>
            <Link to="/#earning-apps" className={cn("px-2 py-3.5 text-sm font-bold whitespace-nowrap transition-colors border-b-2 focus:outline-none", currentTab === '#earning-apps' ? "border-primary text-primary" : "border-transparent text-zinc-400 hover:text-white")}>
              Earning Apps
            </Link>
            <Link to="/#products" className={cn("px-2 py-3.5 text-sm font-bold whitespace-nowrap transition-colors border-b-2 focus:outline-none", currentTab === '#products' ? "border-primary text-primary" : "border-transparent text-zinc-400 hover:text-white")}>
              Products
            </Link>
            <Link to="/#about" className={cn("px-2 py-3.5 text-sm font-bold whitespace-nowrap transition-colors border-b-2 focus:outline-none", currentTab === '#about' ? "border-primary text-primary" : "border-transparent text-zinc-400 hover:text-white")}>
              About Me
            </Link>
          </div>
        </nav>
      )}
      
      {showSecretModal && <PromoterModal onClose={() => setShowSecretModal(false)} />}
    </header>
  );
}
