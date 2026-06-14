import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { useAppStore } from '../lib/store';

export default function PublicAboutView() {
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isVerified, triggerVerification } = useAppStore();

  useEffect(() => {
    const q = query(collection(db, 'about_sections'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setSections(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
       console.error("Error fetching about_sections public:", error);
       setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLinkClick = (e: React.MouseEvent, url: string) => {
    if (!url) return;
    if (!isVerified) {
       e.preventDefault();
       triggerVerification('downloads', false);
    }
  };

  if (loading) {
     return (
        <div className="flex justify-center items-center py-20">
           <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
     );
  }

  if (sections.length === 0) {
     return (
        <div className="py-20 text-center text-zinc-500 font-medium">
           No information available at the moment.
        </div>
     );
  }

  return (
    <div className="flex flex-col w-full py-6 px-4 md:px-0 gap-8 animate-in fade-in duration-500">
      {sections.map(sec => (
        <div key={sec.id} className="w-full bg-[#111]/80 backdrop-blur-lg border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col items-center p-6 sm:p-8 relative">
           
           {/* Section Title */}
           {sec.title && (
             <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-6 text-center tracking-tight">
               {sec.title}
             </h2>
           )}

           {/* Section Image */}
           {sec.image && (
             <div className="w-full max-w-lg mb-6 overflow-hidden rounded-[1.5rem] border border-white/5 shadow-inner">
               <img src={sec.image} alt={sec.title || 'About Image'} className="w-full h-auto object-cover max-h-[300px]" />
             </div>
           )}

           {/* Content */}
           {sec.content && (
             <p className="text-zinc-300 text-sm sm:text-base leading-relaxed text-center max-w-2xl mb-8 whitespace-pre-wrap font-medium">
               {sec.content}
             </p>
           )}

           {/* Primary Button */}
           {sec.buttonName && sec.link1 && (
             <a 
               href={sec.link1}
               target="_blank"
               rel="noopener noreferrer"
               onClick={(e) => handleLinkClick(e, sec.link1)}
               className="px-8 py-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white font-extrabold rounded-2xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center justify-center gap-3 w-full sm:w-auto min-w-[200px] active:scale-95"
             >
               <span className="text-base tracking-wide">{sec.buttonName}</span>
               <ArrowRight className="w-5 h-5" />
             </a>
           )}

           {/* Alternative Link without Button format */}
           {!sec.buttonName && sec.link1 && (
             <a 
               href={sec.link1}
               target="_blank"
               rel="noopener noreferrer"
               onClick={(e) => handleLinkClick(e, sec.link1)}
               className="text-primary hover:text-white font-bold transition-colors underline underline-offset-4 decoration-primary/50"
             >
               Visit Link
             </a>
           )}

           {/* Secondary Link */}
           {sec.link2 && (
             <a 
               href={sec.link2}
               target="_blank"
               rel="noopener noreferrer"
               onClick={(e) => handleLinkClick(e, sec.link2)}
               className="mt-6 text-sm text-zinc-400 hover:text-white font-medium transition-colors flex items-center gap-1 group"
             >
               <span>Additional Information</span>
               <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-primary transition-colors" />
             </a>
           )}
        </div>
      ))}
    </div>
  );
}
