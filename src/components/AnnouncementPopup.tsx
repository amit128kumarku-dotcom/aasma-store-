import { useState, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { X } from 'lucide-react';

export default function AnnouncementPopup() {
  const { announcement } = useAppStore();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if dismissed before
    if (announcement && announcement.enabled) {
      const dismissed = localStorage.getItem(`dismiss_ann_${announcement.id}`);
      if (!dismissed) {
        setIsVisible(true);
      }
    } else {
      setIsVisible(false);
    }
  }, [announcement]);

  const handleDismiss = () => {
    if (announcement) {
      localStorage.setItem(`dismiss_ann_${announcement.id}`, 'true');
    }
    setIsVisible(false);
  };

  if (!isVisible || !announcement) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur-md transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {announcement.image && (
          <div className="w-full aspect-video bg-black">
            <img src={announcement.image} alt={announcement.title} loading="lazy" className="w-full h-full object-cover" />
          </div>
        )}
        
        <div className="p-6 flex flex-col gap-2">
          <h2 className="text-xl font-bold text-white tracking-tight">{announcement.title}</h2>
          {announcement.description && (
             <p className="text-zinc-400 text-sm leading-relaxed mb-4">{announcement.description}</p>
          )}

          {announcement.link ? (
            <a 
              href={announcement.link}
              target="_blank"
              onClick={handleDismiss}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-white text-center font-medium rounded-xl transition-transform active:scale-95"
            >
              Learn More
            </a>
          ) : (
            <button 
              onClick={handleDismiss}
              className="w-full py-3 bg-white/10 hover:bg-white/15 text-white text-center font-medium rounded-xl transition-colors"
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
