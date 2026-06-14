import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Helmet } from 'react-helmet-async';
import { Loader2, ArrowLeft, CheckCircle2, UserPlus, UserCheck } from 'lucide-react';
import ItemCard from '../components/ItemCard';
import { cn } from '../lib/utils';

export default function CreatorProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [creator, setCreator] = useState<any>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [earningApps, setEarningApps] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState('apps');

  useEffect(() => {
    async function loadCreator() {
      if (!username) return;
      try {
        const q = query(collection(db, 'promoters'), where('username', '==', username));
        const snap = await getDocs(q);
        if (snap.empty) {
          setLoading(false);
          return;
        }
        
        const creatorDoc = snap.docs[0];
        setCreator({ id: creatorDoc.id, ...creatorDoc.data() });
        
        // Track View
        const tracked = localStorage.getItem(`viewed_profile_${creatorDoc.id}`);
        if (!tracked) {
          updateDoc(creatorDoc.ref, { totalViews: increment(1) });
          localStorage.setItem(`viewed_profile_${creatorDoc.id}`, 'true');
        }

        // Check if following
        setIsFollowing(localStorage.getItem(`following_${creatorDoc.id}`) === 'true');

        // Fetch their content
        const fetchContent = async (colName: string) => {
          const contentQ = query(collection(db, colName), where('creatorId', '==', creatorDoc.id));
          const snapshot = await getDocs(contentQ);
          return snapshot.docs.map(d => ({ id: d.id, type: colName, ...d.data() }));
        };

        const [a, ea, p] = await Promise.all([
           fetchContent('apps'),
           fetchContent('earning_apps'),
           fetchContent('products')
        ]);
        
        setApps(a);
        setEarningApps(ea);
        setProducts(p);

      } catch (err) {
        console.error("Error loading creator", err);
      } finally {
        setLoading(false);
      }
    }
    
    loadCreator();
  }, [username]);

  const handleFollow = async () => {
    if (!creator) return;
    
    if (isFollowing) {
       // Optional unfollow logic
       await updateDoc(doc(db, 'promoters', creator.id), { totalFollowers: increment(-1) });
       setCreator({ ...creator, totalFollowers: Math.max(0, (creator.totalFollowers || 0) - 1) });
       setIsFollowing(false);
       localStorage.removeItem(`following_${creator.id}`);
    } else {
       await updateDoc(doc(db, 'promoters', creator.id), { totalFollowers: increment(1) });
       setCreator({ ...creator, totalFollowers: (creator.totalFollowers || 0) + 1 });
       setIsFollowing(true);
       localStorage.setItem(`following_${creator.id}`, 'true');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-[70vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  
  if (!creator) return (
     <div className="flex flex-col justify-center items-center h-[70vh] text-zinc-500">
        <h2 className="text-xl font-bold mb-2">Creator Not Found</h2>
        <button onClick={() => navigate('/')} className="text-primary hover:underline">Go Back Home</button>
     </div>
  );

  return (
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 pb-32">
      <Helmet>
        <title>{creator.name} | Aasma Store</title>
      </Helmet>

      <button onClick={() => navigate('/')} className="mb-6 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium">
         <ArrowLeft className="w-5 h-5" /> Back to Store
      </button>

      {/* Profile Header */}
      <div className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 text-center sm:text-left">
         <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-primary/20 border-4 border-[#151515] shrink-0 font-bold text-4xl text-primary flex items-center justify-center">
            {creator.logo ? <img src={creator.logo} className="w-full h-full object-cover" /> : creator.name.charAt(0).toUpperCase()}
         </div>
         
         <div className="flex-1 min-w-0 flex flex-col sm:items-start items-center">
            <div className="flex items-center gap-2 mb-1">
               <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{creator.name}</h1>
               {creator.level >= 1 && (
                  <div title={`Level ${creator.level} Creator`} className={cn("p-1 rounded-full", creator.level >= 2 ? "bg-blue-500/20 text-blue-500" : "bg-green-500/20 text-green-500")}>
                     <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
               )}
            </div>
            
            <p className="text-primary font-medium mb-4">@{creator.username}</p>
            
            {creator.bio && <p className="text-zinc-400 text-sm max-w-lg mb-6 leading-relaxed">{creator.bio}</p>}
            
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-6 sm:gap-8 w-full mt-auto">
               <div className="flex flex-col items-center sm:items-start">
                  <span className="text-xl font-bold text-white">{creator.totalFollowers || 0}</span>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Followers</span>
               </div>
               <div className="flex flex-col items-center sm:items-start">
                  <span className="text-xl font-bold text-white">{creator.totalViews || 0}</span>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Views</span>
               </div>
               
               <div className="ml-auto flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                 <button 
                   onClick={handleFollow}
                   className={cn("flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm transition-all active:scale-95", isFollowing ? "bg-white/5 hover:bg-white/10 text-white border border-white/10" : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20")}
                 >
                   {isFollowing ? <><UserCheck className="w-4 h-4" /> Following</> : <><UserPlus className="w-4 h-4"/> Follow</>}
                 </button>
                 {creator.affiliateUrl && (
                    <button 
                      onClick={() => window.open(creator.affiliateUrl, '_blank')}
                      className="flex-1 sm:flex-none flex items-center justify-center px-6 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold text-sm rounded-full shadow-lg shadow-purple-500/20 hover:brightness-110 transition-all active:scale-95"
                    >
                      {creator.affiliateButtonName || 'Visit Link'}
                    </button>
                 )}
               </div>
            </div>
         </div>
      </div>

      {/* Content Tabs */}
      <div className="flex gap-6 mb-6 border-b border-white/5 items-center overflow-x-auto hide-scrollbar touch-pan-x">
         <button onClick={() => setActiveTab('apps')} className={cn("px-2 py-4 font-bold text-sm border-b-2 transition-colors whitespace-nowrap", activeTab === 'apps' ? "border-primary text-primary" : "border-transparent text-zinc-500 hover:text-white")}>
           Apps <span className="ml-1 text-xs opacity-50">({apps.length})</span>
         </button>
         <button onClick={() => setActiveTab('earning_apps')} className={cn("px-2 py-4 font-bold text-sm border-b-2 transition-colors whitespace-nowrap", activeTab === 'earning_apps' ? "border-primary text-primary" : "border-transparent text-zinc-500 hover:text-white")}>
           Earning Apps <span className="ml-1 text-xs opacity-50">({earningApps.length})</span>
         </button>
         <button onClick={() => setActiveTab('products')} className={cn("px-2 py-4 font-bold text-sm border-b-2 transition-colors whitespace-nowrap", activeTab === 'products' ? "border-primary text-primary" : "border-transparent text-zinc-500 hover:text-white")}>
           Products <span className="ml-1 text-xs opacity-50">({products.length})</span>
         </button>
      </div>

      <div className="flex flex-col bg-[#111] border border-white/10 rounded-3xl overflow-hidden">
         {activeTab === 'apps' && apps.length > 0 && apps.map((item: any) => <ItemCard key={item.id} item={item} />)}
         {activeTab === 'earning_apps' && earningApps.length > 0 && earningApps.map((item: any) => <ItemCard key={item.id} item={item} />)}
         {activeTab === 'products' && products.length > 0 && products.map((item: any) => <ItemCard key={item.id} item={item} />)}
         
         {(activeTab === 'apps' && apps.length === 0) || 
          (activeTab === 'earning_apps' && earningApps.length === 0) || 
          (activeTab === 'products' && products.length === 0) ? (
            <div className="text-center py-24 text-zinc-600 font-medium">No published content in this category yet.</div>
         ) : null}
      </div>

    </div>
  );
}
