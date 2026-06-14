import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Helmet } from 'react-helmet-async';
import { ItemType, StoreItem } from '../types';
import LoadingScreen from '../components/LoadingScreen';
import { User, UserCheck, UserPlus, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

import { useAppStore } from '../lib/store';

export default function ItemDetailsPage({ type }: { type: ItemType }) {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<StoreItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState<number>(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [creatorInfo, setCreatorInfo] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  const { isVerified, triggerVerification } = useAppStore();

  useEffect(() => {
    if (!id) return;
    
    setLoading(true);
    const docRef = doc(db, type, id);
    const unsub = onSnapshot(docRef, { includeMetadataChanges: true }, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setItem({ id: docSnap.id, ...data, type } as StoreItem);
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      if (!item) setLoading(false);
    });

    return () => unsub();
  }, [id, type]);

  useEffect(() => {
     if (item?.creatorId) {
        import('firebase/firestore').then(({ doc, getDoc }) => {
           getDoc(doc(db, 'promoters', item.creatorId)).then(d => {
              if (d.exists()) {
                 setCreatorInfo({ id: d.id, ...d.data() });
                 setIsFollowing(localStorage.getItem(`following_${d.id}`) === 'true');
              }
           });
        });
     }
  }, [item?.creatorId]);

  const handleFollow = async () => {
    if (!creatorInfo) return;
    try {
      if (isFollowing) {
         await import('firebase/firestore').then(({ doc, updateDoc, increment }) => 
            updateDoc(doc(db, 'promoters', creatorInfo.id), { totalFollowers: increment(-1) })
         );
         setCreatorInfo({ ...creatorInfo, totalFollowers: Math.max(0, (creatorInfo.totalFollowers || 0) - 1) });
         setIsFollowing(false);
         localStorage.removeItem(`following_${creatorInfo.id}`);
      } else {
         await import('firebase/firestore').then(({ doc, updateDoc, increment }) => 
            updateDoc(doc(db, 'promoters', creatorInfo.id), { totalFollowers: increment(1) })
         );
         setCreatorInfo({ ...creatorInfo, totalFollowers: (creatorInfo.totalFollowers || 0) + 1 });
         setIsFollowing(true);
         localStorage.setItem(`following_${creatorInfo.id}`, 'true');
      }
    } catch(e) { console.error(e) }
  };

  const submitRating = async (ratingVal: number) => {
    if (!id || submittingRating || userRating) return;
    setSubmittingRating(true);
    try {
      await addDoc(collection(db, 'ratings'), {
        itemId: id,
        itemType: type,
        rating: ratingVal,
        createdAt: serverTimestamp()
      });
      setUserRating(ratingVal);
      // Wait, we also want to display updated rating. For now, it won't instantly update 
      // the average rating display since we depend on an admin or cloud func to update the parent document,
      // OR we could recount natively here, but since it's just a UI display we can fake the local state update.
      setItem(prev => {
        if (!prev) return prev;
        const total = (prev.totalRatings || 0) + 1;
        const sum = (prev.averageRating || 0) * (prev.totalRatings || 0) + ratingVal;
        return { ...prev, totalRatings: total, averageRating: sum / total };
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!item) {
    return <div className="p-8 flex justify-center text-zinc-500">Item not found.</div>;
  }

  const isProduct = item.type === 'products';
  const name = (isProduct ? item.productName : (item as any).name) || 'Unknown Item';
  const title = (isProduct ? item.productTitle : (item as any).title) || '';
  const logo = item.logo || (isProduct ? item.productImage : null);
  const link = (item as any).link || item.referralLink || item.affiliateLink || (Array.isArray(item.additionalLinks) && item.additionalLinks.length > 0 ? item.additionalLinks[0] : null);
  const rawLinks = item.additionalLinks;
  const additionalLinks = Array.isArray(rawLinks) 
    ? rawLinks
    : (typeof rawLinks === 'string' && rawLinks.trim() !== '' ? rawLinks.split(/[\n,]+/).map((s:string) => s.trim()).filter(Boolean) : []);
  const rawScreenshots = isProduct ? item.productImages : (item as any).screenshots;
  const screenshots = Array.isArray(rawScreenshots) 
    ? rawScreenshots 
    : (typeof rawScreenshots === 'string' && rawScreenshots.trim() !== '' ? rawScreenshots.split(/[\n,]+/).map((s:string) => s.trim()).filter(Boolean) : []);
  const avgRating = item.averageRating || 0;
  const totalRatings = item.totalRatings || 0;

  const btnText = isProduct ? 'Buy Now' : 'Download Now';

  return (
    <div className="w-full flex justify-center pb-24">
      <div className="w-full max-w-3xl px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8">
        <Helmet>
          <title>{name} | Aasma Store</title>
          <meta name="description" content={title} />
          {item.seoKeywords && <meta name="keywords" content={item.seoKeywords} />}
        </Helmet>

        {/* Header Profile - Flat Layout */}
        <div className="flex gap-4 sm:gap-6 w-full items-start sm:items-center">
          <div className="relative w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-3xl overflow-hidden bg-black flex-shrink-0 border border-white/10 shadow-lg">
            {logo ? (
              <img src={logo} alt={name} loading="lazy" className="w-full h-full object-contain p-2" />
            ) : (
               <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-500 text-xs sm:text-sm">No Image</div>
            )}
            {/* Small icon on logo to view profile */}
            {creatorInfo && (
               <Link to={`/creator/${creatorInfo.username}`} className="absolute top-1 right-1 bg-black/60 p-1.5 rounded-full backdrop-blur-sm shadow hover:bg-black/80 transition flex items-center justify-center group" title="View Creator">
                 <User className="w-3.5 h-3.5 text-white group-hover:text-primary transition-colors" />
               </Link>
            )}
          </div>
          <div className="flex-1 flex flex-col min-w-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2 truncate">{name}</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
               <div className="flex items-center gap-2">
                 <div className="flex items-center text-yellow-500 text-lg sm:text-xl drop-shadow-md">
                  {'★'.repeat(Math.max(0, Math.min(5, Math.round(avgRating) || 0)))}
                  <span className="text-zinc-700">{'★'.repeat(Math.max(0, Math.min(5, 5 - (Math.round(avgRating) || 0))))}</span>
                 </div>
                 <span className="text-sm font-medium text-zinc-400">
                  {avgRating.toFixed(1)} ({totalRatings})
                 </span>
               </div>
               
               {/* Creator Follow Info */}
               {creatorInfo && (
                  <div className="flex items-center gap-3 bg-white/5 pl-2 pr-1 py-1 rounded-full border border-white/10 shrink-0 w-max">
                     <Link to={`/creator/${creatorInfo.username}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                        <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold overflow-hidden">
                           {creatorInfo.logo ? <img src={creatorInfo.logo} className="w-full h-full object-cover"/> : creatorInfo.name.charAt(0)}
                        </div>
                        <span className="text-xs font-bold text-white max-w-[80px] truncate">{creatorInfo.name}</span>
                        {creatorInfo.level >= 1 && <CheckCircle2 className={cn("w-3 h-3", creatorInfo.level >= 2 ? "text-blue-500" : "text-green-500")} />}
                     </Link>
                     <span className="text-[10px] text-zinc-500 font-medium px-1 border-l border-white/10">{creatorInfo.totalFollowers || 0}</span>
                     <button 
                       onClick={handleFollow}
                       className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-colors tracking-wider", isFollowing ? "bg-white/10 text-zinc-300" : "bg-primary text-primary-foreground hover:bg-primary/90")}
                     >
                       {isFollowing ? 'Following' : 'Follow'}
                     </button>
                  </div>
               )}
            </div>
          </div>
        </div>

        {/* Short Title / Description */}
        {title && (
          <p className="text-base sm:text-lg text-zinc-300 font-medium leading-relaxed max-w-full line-clamp-2">
            {title}
          </p>
        )}
        
        {/* Action Buttons */}
        <div className="flex w-full gap-3 mt-1 items-center">
          {link ? (
            <a 
              href={link} 
              target="_blank"
              rel="noopener noreferrer"
              onClick={async (e) => {
                if (!isVerified) {
                  e.preventDefault();
                  triggerVerification('downloads', false); // Require verification strictly
                  return;
                }
                const ref = sessionStorage.getItem('promoter_ref');
                if (ref) {
                  const trackKey = 'promoter_conv_' + ref + '_' + id;
                  if (!sessionStorage.getItem(trackKey)) {
                    sessionStorage.setItem(trackKey, 'true');
                    try {
                      // Find promoter by username
                      const q = query(collection(db, 'promoters'), where('username', '==', ref));
                      const snap = await getDocs(q);
                      if (!snap.empty) {
                        const promoterDoc = snap.docs[0];
                        import('firebase/firestore').then(({ updateDoc, increment }) => {
                           updateDoc(promoterDoc.ref, { successfulConversions: increment(1) });
                           
                           // Also try to update the specific link conversion count
                           const lq = query(collection(db, 'promoter_links'), where('promoterId', '==', promoterDoc.id), where('originalUrl', '==', window.location.pathname));
                           getDocs(lq).then(lsnap => {
                             if (!lsnap.empty) {
                               updateDoc(lsnap.docs[0].ref, { conversions: increment(1) });
                             }
                           });
                        });
                      }
                    } catch(e) { console.error("Tracking error", e); }
                  }
                }
              }}
              className="flex-[3] py-4 bg-gradient-btn rounded-xl text-center font-bold text-white shadow-lg overflow-hidden relative group text-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {btnText}
            </a>
          ) : (
            <div className="flex-[3] py-4 bg-white/5 rounded-xl text-center font-bold text-zinc-500 border border-white/5 text-lg">
              Not Available
            </div>
          )}
          <button 
             onClick={async () => {
               const url = window.location.href;
               if (navigator.share) {
                 try { await navigator.share({ title: name, text: title, url }); } catch(err) {}
               } else {
                 navigator.clipboard.writeText(url);
                 setToastMessage('Link copied!');
                 setTimeout(() => setToastMessage(''), 3000);
               }
             }}
             className="flex-1 max-w-[80px] h-full min-h-[60px] flex items-center justify-center bg-[#1a1a1a] hover:bg-[#222] border border-white/10 rounded-xl transition-all hover:scale-105 active:scale-95"
             aria-label="Share"
          >
            <svg className="w-6 h-6 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-5.368m0 5.368l5.657 3.394m-5.657-3.394l5.657-3.394m0 0a3 3 0 115.368 0 3 3 0 01-5.368 0zm0 10a3 3 0 115.368 0 3 3 0 01-5.368 0z" />
            </svg>
          </button>
        </div>

        {/* Screenshots Gallery */}
        {screenshots.length > 0 && (
           <div className="w-full mt-2">
             <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar snap-x snap-mandatory w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
               {screenshots.map((s: string, i: number) => (
                 <button 
                    key={i} 
                    className="flex-shrink-0 snap-start focus:outline-none relative group h-56 md:h-72 lg:h-80"
                    onClick={() => setGalleryIndex(i)}
                 >
                   <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors z-10 rounded-2xl" />
                   <img src={s} alt={`${name} screenshot ${i+1}`} loading="lazy" className="w-auto h-full rounded-2xl border border-white/10 object-contain bg-black shadow-md" />
                 </button>
               ))}
             </div>
           </div>
        )}

        {/* Description */}
        <div className="flex flex-col gap-4 w-full">
          <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-base sm:text-lg bg-transparent">
            {item.description || 'No description provided.'}
          </div>
        </div>

        {/* Additional Links */}
        {additionalLinks.length > 0 && (
          <div className="flex flex-col gap-4 w-full mt-2">
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Additional Links</h3>
            <div className="flex flex-col gap-3">
              {additionalLinks.map((al: string, i: number) => {
                 let label = al;
                 try { label = new URL(al).hostname; } catch(e) {}
                 return (
                   <div key={i} className="flex items-center justify-between py-3 px-4 bg-[#111] border border-white/10 rounded-xl">
                     <span className="text-zinc-300 truncate font-medium flex-1 text-sm sm:text-base mr-3">{label}</span>
                     <a href={al} target="_blank" rel="noopener noreferrer" 
                        onClick={(e) => {
                           if (!isVerified) {
                              e.preventDefault();
                              triggerVerification('downloads', false);
                           }
                        }}
                        className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg transition-colors text-sm whitespace-nowrap">
                       Open
                     </a>
                   </div>
                 );
              })}
            </div>
          </div>
        )}

        {/* Rate Item section */}
        <div className="mt-4 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center md:items-start gap-4">
          <h3 className="text-lg sm:text-xl font-bold text-white">
            {userRating ? 'Thanks for rating!' : 'Rate this item'}
          </h3>
          <div className="flex gap-2">
            {[1,2,3,4,5].map(star => (
              <button 
                key={star}
                disabled={submittingRating || userRating > 0}
                onClick={() => submitRating(star)}
                className={`text-3xl transition-transform hover:scale-125 focus:outline-none ${userRating >= star ? 'text-yellow-500' : 'text-zinc-700 hover:text-yellow-500/50'}`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {galleryIndex !== null && (
          <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setGalleryIndex(null)}>
            <img 
              src={screenshots[galleryIndex]} 
              loading="lazy"
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" 
              alt="Fullscreen" 
              onClick={e => e.stopPropagation()}
            />
            <button 
              className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-colors shadow-xl"
              onClick={() => setGalleryIndex(null)}
            >
              ✕
            </button>
          </div>
        )}
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white text-black px-6 py-3 rounded-full font-bold shadow-2xl animate-in fade-in slide-in-from-bottom-5">
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
}
