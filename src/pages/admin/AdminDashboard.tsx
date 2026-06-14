import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, getCountFromServer, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { LayoutDashboard, Settings, AppWindow, PackageOpen, Star, Check, X, User } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    apps: 0,
    earningApps: 0,
    products: 0,
    ratings: 0,
    successfulSessions: 0,
    failedSessions: 0
  });

  const [monetizationRequests, setMonetizationRequests] = useState<any[]>([]);
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [promoterData, setPromoterData] = useState<any | null>(null);

  const [allPromoters, setAllPromoters] = useState<any[]>([]);
  const [selectedPromoter, setSelectedPromoter] = useState<any | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const appsCount = await getCountFromServer(collection(db, 'apps'));
        const earningCount = await getCountFromServer(collection(db, 'earning_apps'));
        const productsCount = await getCountFromServer(collection(db, 'products'));

        const adsSnap = await getDocs(query(collection(db, 'ads')));
        let totalSessions = 0;
        let successfulSessions = 0;
        let failedSessions = 0;
        adsSnap.forEach(d => {
          const dt = d.data();
          totalSessions += dt.clicks || 0;
          successfulSessions += dt.success || 0;
          failedSessions += dt.failed || 0;
        });

        setStats({
          apps: appsCount.data().count,
          earningApps: earningCount.data().count,
          products: productsCount.data().count,
          ratings: totalSessions, // Reusing ratings state to hold total sessions
          successfulSessions,
          failedSessions
        });
      } catch (err) {
        console.error("Error fetching stats", err);
      }
    }
    fetchStats();

    const q2 = query(collection(db, 'monetization_requests'), orderBy('createdAt', 'desc'));
    const unsub2 = onSnapshot(q2, (snap) => setMonetizationRequests(snap.docs.map(d => ({ id: d.id, _type: 'monetization', ...d.data() }))), (err) => console.error("Admin q2", err));

    const qPromoters = query(collection(db, 'promoters'), orderBy('createdAt', 'desc'));
    const unsubPromoters = onSnapshot(qPromoters, (snap) => setAllPromoters(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (err) => console.error("Admin qPromoters", err));

    return () => {
       unsub2();
       unsubPromoters();
    };
  }, []);

  useEffect(() => {
     if (selectedReq?.creatorId) {
        import('firebase/firestore').then(({ doc, getDoc }) => {
           getDoc(doc(db, 'promoters', selectedReq.creatorId)).then(d => {
             if (d.exists()) setPromoterData(d.data());
             else setPromoterData(null);
           }).catch(() => setPromoterData(null));
        });
     } else {
        setPromoterData(null);
     }
  }, [selectedReq]);

  const updatePromoterItemsLevel = async (creatorId: string, level: number) => {
     try {
        const { getDocs, query, where, collection, writeBatch } = await import('firebase/firestore');
        const batch = writeBatch(db);
        const types = ['apps', 'earning_apps', 'products'];
        for (const type of types) {
           const q = query(collection(db, type), where('creatorId', '==', creatorId));
           const snap = await getDocs(q);
           snap.forEach(d => {
              batch.update(d.ref, { creatorLevel: level });
           });
        }
        await batch.commit();
     } catch(e) { console.error('Failed to update item levels', e); }
  };

  const handleApprove = async (req: any) => {
    try {
      await updateDoc(doc(db, 'monetization_requests', req.id), { status: 'approved' });
      await updateDoc(doc(db, 'promoters', req.creatorId), {
         level: req.level,
         monetizationStatus: `approved_l${req.level}`
      });
      await updatePromoterItemsLevel(req.creatorId, req.level);
    } catch (e) {
      console.error(e);
      alert("Failed to approve monetization.");
    }
    setSelectedReq(null);
  };

  const handleReject = async (req: any) => {
    await updateDoc(doc(db, 'monetization_requests', req.id), { status: 'rejected' });
    const prevLevel = req.level > 1 ? req.level - 1 : 0;
    await updateDoc(doc(db, 'promoters', req.creatorId), { 
      monetizationStatus: prevLevel > 0 ? `approved_l${prevLevel}` : 'locked' 
    });
    setSelectedReq(null);
  };

  const pendingMonetization = monetizationRequests
    .sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis())
    .filter(r => r.status === 'pending');

  const statCards = [
    { label: 'Total Apps', value: stats.apps, icon: AppWindow, link: '/admin/apps', color: 'bg-blue-500/10 text-blue-500' },
    { label: 'Earning Apps', value: stats.earningApps, icon: LayoutDashboard, link: '/admin/earning-apps', color: 'bg-emerald-500/10 text-emerald-500' },
    { label: 'Products', value: stats.products, icon: PackageOpen, link: '/admin/products', color: 'bg-purple-500/10 text-purple-500' },
    { label: 'Total Verifications', value: stats.ratings, icon: Star, link: '#', color: 'bg-yellow-500/10 text-yellow-500' },
    { label: 'Success Verifications', value: stats.successfulSessions, icon: Check, link: '#', color: 'bg-green-500/10 text-green-500' },
    { label: 'Failed Verifications', value: stats.failedSessions, icon: X, link: '#', color: 'bg-red-500/10 text-red-500' }
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
          <p className="text-zinc-500 text-sm">Overview of your store's performance and inventory.</p>
        </div>
        <Link to="/admin/settings" className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
          <Settings className="w-5 h-5 text-zinc-400" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, i) => (
          <Link key={i} to={stat.link} className="p-6 rounded-2xl border border-white/10 bg-[#111] hover:bg-[#151515] transition-colors flex flex-col gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-zinc-500 font-medium text-sm">{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <h2 className="font-bold text-white text-lg mb-4">Monetization Requests</h2>
        {pendingMonetization.length === 0 ? (
          <div className="bg-[#111] border border-white/10 rounded-2xl p-8 text-center text-zinc-500 shadow-sm">
             No pending requests at the moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pendingMonetization.map(req => (
              <div 
                key={req.id} 
                onClick={() => setSelectedReq(req)}
                className="bg-[#111] border border-white/10 p-5 rounded-2xl cursor-pointer hover:bg-[#151515] hover:border-white/20 hover:-translate-y-0.5 transition-all flex items-center gap-4 shadow-sm"
              >
                 <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center shrink-0 shadow-inner text-lg">
                   {req.creatorName?.charAt(0).toUpperCase()}
                 </div>
                 <div className="flex-1 min-w-0">
                    <h4 className="text-white font-bold truncate">{req.creatorName}</h4>
                    <p className="text-zinc-500 text-xs truncate font-medium">
                       Monetization Level {req.level}
                    </p>
                    <p className="text-zinc-600 text-[10px] uppercase mt-1 font-bold tracking-wider">{req.createdAt?.toDate().toLocaleDateString()}</p>
                 </div>
                 <span className="px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] font-bold uppercase tracking-wider rounded-lg shrink-0">Pending</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Popup Modal */}
      {selectedReq && (
        <div className="absolute inset-0 z-50 bg-black min-h-screen flex animate-in fade-in pb-24">
          <div className="w-full max-w-2xl mx-auto py-8 px-4 sm:px-6 md:py-12 flex flex-col">
             <div className="flex justify-between items-center pb-4 border-b border-white/10 mt-2">
                 <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Review Monetization</h3>
                 <button onClick={() => setSelectedReq(null)} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors">
                   <X className="w-6 h-6"/>
                 </button>
             </div>
             
             <div className="flex flex-col gap-8 pt-8">
                {/* SECTION 1: Top Row */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/5 border border-white/10 shrink-0 flex items-center justify-center">
                    <User className="w-8 h-8 text-zinc-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                     <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">{selectedReq.creatorName}</h1>
                     <p className="text-sm font-medium text-zinc-300 truncate mt-1">@{selectedReq.creatorUsername || selectedReq.creatorName}</p>   
                     <p className="text-[10px] sm:text-xs text-zinc-500 truncate">ID: {selectedReq.creatorId}</p>
                  </div>
                </div>

                {/* SECTION 2: Details */}
                <div className="flex flex-col gap-4">
                  <p className="text-base sm:text-lg text-zinc-200 font-medium leading-snug">Monetization Access - Level {selectedReq.level}</p>
                  
                  {promoterData ? (
                    <div className="grid grid-cols-3 gap-4 mt-2">
                       <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col items-center">
                          <p className="text-zinc-500 text-xs font-bold uppercase mb-1">Followers</p>
                          <p className="text-xl font-bold text-white">{promoterData.totalFollowers || 0}</p>
                       </div>
                       <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col items-center">
                          <p className="text-zinc-500 text-xs font-bold uppercase mb-1">Downloads</p>
                          <p className="text-xl font-bold text-white">{promoterData.totalDownloads || 0}</p>
                       </div>
                       <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col items-center">
                          <p className="text-zinc-500 text-xs font-bold uppercase mb-1">Views</p>
                          <p className="text-xl font-bold text-white">{promoterData.totalViews || 0}</p>
                       </div>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-400 whitespace-pre-wrap leading-relaxed">Loading metrics...</p>
                  )}
                </div>
             </div>
             
             {/* SECTION 5: Action Bar */}
             <div className="flex gap-4 pt-6 mt-12 pb-8">
               <button onClick={() => handleApprove(selectedReq)} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl transition-colors flex justify-center items-center gap-2 text-base">
                 <Check className="w-5 h-5"/> Approve
               </button>
               <button onClick={() => handleReject(selectedReq)} className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-4 rounded-xl transition-colors flex justify-center items-center gap-2 border border-red-500/20 text-base">
                 <X className="w-5 h-5"/> Reject
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Promoters List */}
      <div className="mt-8 border-t border-white/10 pt-8">
        <h2 className="font-bold text-white text-lg mb-4">All Promoters</h2>
        {allPromoters.length === 0 ? (
           <div className="bg-[#111] border border-white/10 rounded-2xl p-8 text-center text-zinc-500 shadow-sm">No promoters found.</div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allPromoters.map((p, idx, arr) => (
                 <div key={p.id} className="bg-[#111] border border-white/10 rounded-2xl p-5 hover:bg-[#151515] transition-all hover:border-white/20 hover:-translate-y-0.5 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                       <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-lg shadow-inner">
                         {p.name?.charAt(0).toUpperCase()}
                       </div>
                       <div className="min-w-0 flex-1">
                          <p className="text-white font-bold truncate text-base">{p.name}</p>
                          <p className="text-zinc-500 font-medium text-sm truncate">@{p.username}</p>
                       </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/5">
                       <div className="flex flex-col items-center justify-center">
                          <span className="text-white font-bold">{p.totalFollowers || 0}</span>
                          <span className="text-zinc-500 mb-1 uppercase font-bold text-[10px]">Followers</span>
                       </div>
                       <div className="flex flex-col items-center justify-center border-x border-white/5">
                          <span className="text-white font-bold">{p.totalViews || 0}</span>
                          <span className="text-zinc-500 mb-1 uppercase font-bold text-[10px]">Views</span>
                       </div>
                       <div className="flex flex-col items-center justify-center">
                          <span className="text-white font-bold">Lvl {p.level || 0}</span>
                          <span className="text-zinc-500 mb-1 uppercase font-bold text-[10px]">Tier</span>
                       </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 shrink-0 mt-1">
                       {p.level < 3 && p.totalFollowers >= 1000 && p.totalDownloads >= 3000 && p.totalViews >= 10000 && (
                          <button 
                            onClick={async () => {
                              if(!window.confirm('Promote to Level 3 (Business Partner)?')) return;
                              await updateDoc(doc(db, 'promoters', p.id), { level: 3, monetizationStatus: 'approved_l3' });
                              await updatePromoterItemsLevel(p.id, 3);
                            }}
                            className="w-full px-4 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-bold uppercase rounded-xl transition-all border border-blue-500/20 shadow-sm"
                          >
                            Grant Business Partner
                          </button>
                       )}
                       {p.level === 3 && (
                         <span className="w-full text-center px-4 py-2 bg-green-500/10 text-green-500 rounded-xl text-xs font-bold uppercase tracking-wider border border-green-500/20 shadow-sm flex items-center justify-center gap-2">
                           <Check className="w-3 h-3" /> Level 3 Active
                         </span>
                       )}
                    </div>
                 </div>
              ))}
           </div>
        )}
      </div>
    </div>
  );
}
