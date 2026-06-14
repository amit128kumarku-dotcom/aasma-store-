import { useState, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { Search, X } from 'lucide-react';
import { collection, query, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { StoreItem } from '../types';
import { Link } from 'react-router-dom';

export default function SearchOverlay() {
  const { isSearchOpen, setSearchOpen } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<StoreItem[]>([]);
  const [searching, setSearching] = useState(false);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSearchOpen) setSearchOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setSearchOpen]);

  // Prevent scroll when open
  useEffect(() => {
    if (isSearchOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isSearchOpen]);

  // Handle Search
  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
         // Since Firestore doesn't have native full-text search, we will fetch recent items and filter client side 
         // For a real production app with many items, Algolia or Meilisearch is recommended.
         // Here we fetch up to 100 recent items per collection and filter them. MVP logic.
         const collections = ['apps', 'earning_apps', 'products'];
         let allItems: any[] = [];
         
         for (const col of collections) {
            const q = query(collection(db, col), orderBy('createdAt', 'desc'), limit(50));
            const snap = await getDocs(q);
            snap.forEach(doc => {
              allItems.push({ id: doc.id, type: col, ...doc.data() });
            });
         }

         const filtered = allItems.filter(item => {
           const name = item.name || item.productName || '';
           const title = item.title || item.productTitle || '';
           const desc = item.description || '';
           const keywords = item.seoKeywords || '';
           
           return name.toLowerCase().includes(term) ||
                  title.toLowerCase().includes(term) ||
                  keywords.toLowerCase().includes(term);
         });

         setResults(filtered.slice(0, 10));
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col pt-16 sm:pt-24 px-4 overflow-y-auto">
      <div 
         className="absolute inset-0"
         onClick={() => setSearchOpen(false)}
      />
      <div className="relative w-full max-w-3xl mx-auto flex flex-col gap-4">
        
        <div className="relative flex items-center">
          <Search className="absolute left-4 text-zinc-400 w-6 h-6" />
          <input 
            type="text"
            className="w-full bg-[#111] border border-white/10 rounded-2xl h-16 pl-14 pr-16 text-xl text-white placeholder-zinc-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xl transition-all"
            placeholder="Search apps, products..."
            autoFocus
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button 
            className="absolute right-4 p-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            onClick={() => setSearchOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col mb-12">
          {searchTerm.length >= 2 ? (
            <div className="p-2">
              {searching ? (
                <div className="p-4 text-center text-zinc-500">Searching...</div>
              ) : results.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {results.map(item => {
                    const name = item.type === 'products' ? (item as any).productName : (item as any).name;
                    const logo = item.type === 'products' ? (item as any).productImage : (item as any).logo;
                    const path = item.type === 'apps' ? `/apps/${item.id}` : item.type === 'earning_apps' ? `/earning-apps/${item.id}` : `/products/${item.id}`;
                    return (
                      <Link 
                        key={item.id} 
                        to={path}
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                      >
                         <div className="w-12 h-12 bg-black rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
                           {logo ? <img src={logo} loading="lazy" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-900" />}
                         </div>
                         <div className="flex flex-col">
                           <span className="text-white font-medium group-hover:text-primary transition-colors">{name}</span>
                           <span className="text-xs text-zinc-500 uppercase tracking-widest">{item.type.replace('_', ' ')}</span>
                         </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                 <div className="p-8 text-center text-zinc-500">No results found for "{searchTerm}"</div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-zinc-600/50 flex flex-col items-center justify-center h-48">
               <Search className="w-8 h-8 mb-2 opacity-20" />
               Type at least 2 characters to search
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
