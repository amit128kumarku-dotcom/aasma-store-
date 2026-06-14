import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, getDoc, doc, addDoc, serverTimestamp, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useAppStore } from '../../lib/store';
import { Loader2, Link2, Copy, BarChart3, Users, CheckCircle2, ChevronLeft, Upload, Crown, Clock, Star, ImageIcon, X, Edit2, Edit3, Trash2, Plus, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import FileUpload from '../../components/admin/FileUpload';

import AdLocker from '../../components/AdLocker';

export default function PromoterDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [creator, setCreator] = useState<any>(null);
  const [stats, setStats] = useState({ 
    totalFollowers: 0, 
    totalDownloads: 0, 
    totalViews: 0, 
    successfulUploads: 0,
    monetizationStatus: 'locked',
    level: 0
  });
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'apps' | 'earning_apps' | 'products' | 'about'>('dashboard');
  const [requests, setRequests] = useState<any[]>([]);
  
  // Submit new app states
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitData, setSubmitData] = useState<any>({ type: 'apps' });
  const [submitting, setSubmitting] = useState(false);
  
  // Upload Ad Lock state
  const [pendingUploadPayload, setPendingUploadPayload] = useState<any>(null);
  const [showUploadAdLock, setShowUploadAdLock] = useState(false);

  const [bioModalOpen, setBioModalOpen] = useState(false);
  const [setupModalOpen, setSetupModalOpen] = useState(false);

  // New setup form state
  const [setupForm, setSetupForm] = useState({ affiliateUrl: '', bio: '' });

  // New edit profile form state
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({ name: '', logo: '' });

  const [deleteConfirmReq, setDeleteConfirmReq] = useState<any>(null);

  useEffect(() => {
    const uid = localStorage.getItem('promoter_uid');
    if (!uid) {
      navigate('/');
      return;
    }
    
    try {
      const docRef = doc(db, 'promoters', uid);
      const unsubPromoter = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setCreator({ id: snap.id, ...data });
          setStats({
            totalFollowers: data.totalFollowers || 0,
            totalDownloads: data.totalDownloads || 0,
            totalViews: data.totalViews || 0,
            successfulUploads: data.successfulUploads || 0,
            monetizationStatus: data.monetizationStatus || 'locked',
            level: data.level || 0
          });
          
          if (!data.affiliateUrl || !data.bio) {
             setSetupForm({ affiliateUrl: data.affiliateUrl || '', bio: data.bio || '' });
             setSetupModalOpen(true);
          } else {
             setSetupModalOpen(false);
          }
          
          setLoading(false);
        } else {
          navigate('/');
        }
      });

      const q = query(
        collection(db, 'creator_requests'),
        where('creatorId', '==', uid)
      );
      const unsubRequests = onSnapshot(q, (snap) => {
        const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        reqs.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setRequests(reqs);
      }, (err) => console.error("Creator requests query", err));

      return () => {
        unsubPromoter();
        unsubRequests();
      };
    } catch (err) {
      console.error(err);
      navigate('/');
    }
  }, [navigate]);

  const handleUpdateCreatorProfile = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!creator) return;
     try {
       await updateDoc(doc(db, 'promoters', creator.id), { 
         name: editProfileForm.name || creator.name,
         logo: editProfileForm.logo || creator.logo || ''
       });
       setEditProfileOpen(false);
     } catch(e) { }
  }

  const handleUpdateCreator = async (field: string, value: string) => {
     if (!value || !creator) return;
     try {
       await updateDoc(doc(db, 'promoters', creator.id), { [field]: value });
     } catch(e) { }
  }

  const handleSaveSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupForm.affiliateUrl || !setupForm.bio || !creator) return;
    try {
      await updateDoc(doc(db, 'promoters', creator.id), {
        affiliateUrl: setupForm.affiliateUrl,
        bio: setupForm.bio
      });
      setSetupModalOpen(false);
    } catch (e) {
       console.error("Failed to save setup");
    }
  };

  const handleApplyMonetization = async (level: number) => {
    if (!creator) return;
    try {
      await addDoc(collection(db, 'monetization_requests'), {
        creatorId: creator.id,
        creatorName: creator.name,
        creatorUsername: creator.username,
        level,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      await setDoc(doc(db, 'promoters', creator.id), {
        monetizationStatus: `pending_l${level}`
      }, { merge: true });
    } catch (e) {
      console.error(e);
      alert("Failed to submit request.");
    }
  };

  const handleSubmitApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creator) return;
    
    const payload = { ...submitData };
    if (payload.screenshots && typeof payload.screenshots === 'string') {
      payload.screenshots = payload.screenshots.split('\n').filter(Boolean);
    }
    if (payload.productImages && typeof payload.productImages === 'string') {
      payload.productImages = payload.productImages.split('\n').filter(Boolean);
    }
    
    // Check limits before showing ad
    const type = payload.type;
    const isEditing = !!payload.id;
    if (!isEditing) {
      const myItems = requests.filter(r => r.data?.type === type);
      let multiplier = 1;
      if (stats.level === 1) multiplier = 5;
      if (stats.level === 2) multiplier = 10;
      if (stats.level >= 3) multiplier = 20;
      
      const limitLimit = type === 'apps' ? 8 * multiplier : (type === 'earning_apps' ? 7 * multiplier : 5 * multiplier);
      if (myItems.length >= limitLimit) {
         alert(`You can only upload a maximum of ${limitLimit} ${type.replace('_', ' ')} at your current level.`);
         return;
      }
    }

    // Prepare payload and show Ad Lock
    setPendingUploadPayload(payload);
    setShowUploadAdLock(true);
  };

  const executeActualUpload = async () => {
    if (!pendingUploadPayload || !creator) return;
    
    const payload = { ...pendingUploadPayload };
    const uploadId = payload.id;
    setPendingUploadPayload(null);
    
    setSubmitting(true);
    setShowUploadAdLock(false);
    
    try {
      const isEditing = !!uploadId;
      const type = payload.type;
      delete payload.id;
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      if (!isEditing) {
        await addDoc(collection(db, 'creator_requests'), {
          creatorId: creator.id,
          creatorName: creator.name,
          status: 'pending',
          createdAt: serverTimestamp(),
          expiresAt: expiresAt.getTime(),
          data: payload
        });
      } else {
        await updateDoc(doc(db, 'creator_requests', uploadId), {
           data: payload,
           updatedAt: serverTimestamp()
        });
        await updateDoc(doc(db, type, uploadId), {
           ...payload,
           updatedAt: serverTimestamp()
        }).catch(() => {});
      }

      setShowSubmitModal(false);
      setSubmitData({ type: activeTab === 'dashboard' ? 'apps' : activeTab });
    } catch (err) {
      console.error(err);
      alert("Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirmReq) return;
    try {
      const type = deleteConfirmReq.data?.type || 'apps';
      await deleteDoc(doc(db, 'creator_requests', deleteConfirmReq.id));
      await deleteDoc(doc(db, type, deleteConfirmReq.id)).catch(() => {});
      setDeleteConfirmReq(null);
    } catch (e) {
      console.error(e);
      alert("Failed to delete.");
    }
  };

  const handleEdit = (req: any) => {
    setSubmitData({ id: req.id, ...req.data });
    setShowSubmitModal(true);
  };

  if (loading) {
    return <div className="flex flex-col flex-1 h-[70vh] items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  const l1Reqs = { followers: 50, downloads: 100, views: 1000 };
  const l1ProgressFollowers = Math.min((stats.totalFollowers / l1Reqs.followers) * 100, 100);
  const l1ProgressDownloads = Math.min((stats.totalDownloads / l1Reqs.downloads) * 100, 100);
  const l1ProgressViews = Math.min((stats.totalViews / l1Reqs.views) * 100, 100);
  const l1Eligible = l1ProgressFollowers === 100 && l1ProgressDownloads === 100 && l1ProgressViews === 100;
  
  const l2Reqs = { followers: 500, downloads: 1500, views: 5000 };
  const l2ProgressFollowers = Math.min((stats.totalFollowers / l2Reqs.followers) * 100, 100);
  const l2ProgressDownloads = Math.min((stats.totalDownloads / l2Reqs.downloads) * 100, 100);
  const l2ProgressViews = Math.min((stats.totalViews / l2Reqs.views) * 100, 100);
  const l2Eligible = l2ProgressFollowers === 100 && l2ProgressDownloads === 100 && l2ProgressViews === 100;

  const l3Reqs = { followers: 1000, downloads: 3000, views: 10000 };
  const l3ProgressFollowers = Math.min((stats.totalFollowers / l3Reqs.followers) * 100, 100);
  const l3ProgressDownloads = Math.min((stats.totalDownloads / l3Reqs.downloads) * 100, 100);
  const l3ProgressViews = Math.min((stats.totalViews / l3Reqs.views) * 100, 100);
  const l3Eligible = l3ProgressFollowers === 100 && l3ProgressDownloads === 100 && l3ProgressViews === 100;

  // Sorting for About Tab (trending)
  const trendingItems = [...requests].sort((a, b) => {
      // Simulate views based on random or createdAt for trending effect if stats not available
      const aVal = a.data?.totalRatings || a.createdAt?.toMillis() || 0;
      const bVal = b.data?.totalRatings || b.createdAt?.toMillis() || 0;
      return bVal - aVal;
  });

  return (
    <div className="w-full relative">
      {/* Upload Ad Lock Overlay */}
      {showUploadAdLock && (
        <AdLocker 
          target="creator" 
          frequency="always" 
          onUnlock={() => executeActualUpload()} 
        />
      )}

      {/* Setup Modal */}
      {setupModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col justify-center px-4 sm:px-6">
           <div className="max-w-md w-full mx-auto bg-[#111] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl animate-in fade-in zoom-in-95">
             <h2 className="text-2xl font-bold text-white mb-2">Welcome, {creator.name}!</h2>
             <p className="text-zinc-400 mb-6 text-sm">Please complete your channel profile to continue.</p>
             <form onSubmit={handleSaveSetup} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                   <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Affiliate / Target URL</label>
                   <input required placeholder="https://..." value={setupForm.affiliateUrl} onChange={e => setSetupForm({...setupForm, affiliateUrl: e.target.value})} className="p-4 rounded-xl bg-[#151515] border border-white/10 focus:ring-2 focus:ring-primary text-white" />
                </div>
                <div className="flex flex-col gap-2 mb-2">
                   <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Channel Bio</label>
                   <textarea required rows={3} placeholder="Tell users about your channel..." value={setupForm.bio} onChange={e => setSetupForm({...setupForm, bio: e.target.value})} className="p-4 rounded-xl bg-[#151515] border border-white/10 focus:ring-2 focus:ring-primary text-white resize-y" />
                </div>
                <button type="submit" className="w-full py-4 rounded-xl bg-white text-black font-bold text-lg hover:bg-zinc-200 transition-all">Save Profile</button>
             </form>
           </div>
        </div>
      )}

      {/* Bio Selection Modal */}
      {bioModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center animate-in fade-in" onClick={() => setBioModalOpen(false)}>
           <div className="w-full sm:max-w-lg bg-[#111] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-4">
                 <h3 className="text-lg font-bold text-white">About {creator.name}</h3>
                 <button onClick={() => setBioModalOpen(false)} className="p-2 bg-white/5 rounded-full text-zinc-400 hover:text-white"><X className="w-5 h-5"/></button>
              </div>
              <p className="text-zinc-300 leading-relaxed text-[15px] whitespace-pre-wrap">{creator.bio}</p>
           </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmReq && (
        <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center px-4 animate-in fade-in" onClick={() => setDeleteConfirmReq(null)}>
           <div className="max-w-sm w-full bg-[#111] p-6 rounded-3xl border border-white/10 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-white mb-2">Delete Item</h3>
              <p className="text-sm text-zinc-400 mb-6">Are you sure you want to delete this {deleteConfirmReq.data?.type?.replace('_', ' ') || 'item'}? This action Cannot be undone.</p>
              <div className="flex gap-3">
                 <button onClick={() => setDeleteConfirmReq(null)} className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors">Cancel</button>
                 <button onClick={executeDelete} className="flex-1 py-3 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-xl font-bold transition-colors">Delete</button>
              </div>
           </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editProfileOpen && (
        <div className="fixed inset-0 z-[105] bg-black/80 flex items-center justify-center px-4 animate-in fade-in" onClick={() => setEditProfileOpen(false)}>
           <div className="max-w-md w-full bg-[#111] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
             <h2 className="text-2xl font-bold text-white mb-6">Edit Profile</h2>
             <form onSubmit={handleUpdateCreatorProfile} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                   <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Channel Name</label>
                   <input required placeholder={creator.name} value={editProfileForm.name} onChange={e => setEditProfileForm({...editProfileForm, name: e.target.value})} className="p-4 rounded-xl bg-black border border-white/5 focus:border-primary/50 focus:ring-1 focus:ring-primary text-white" />
                </div>
                <div className="flex flex-col gap-2">
                   <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Channel Logo</label>
                   <FileUpload path="profiles" onUploadComplete={(url) => setEditProfileForm({...editProfileForm, logo: Array.isArray(url) ? url[0] : url})}/>
                   {editProfileForm.logo && <img src={editProfileForm.logo} className="w-16 h-16 object-cover rounded-[22%] border border-white/10 mt-2 shadow-lg" alt="" />}
                </div>
                <div className="flex gap-3 mt-4">
                   <button type="button" onClick={() => setEditProfileOpen(false)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors">Cancel</button>
                   <button type="submit" className="flex-1 py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold transition-colors">Save Changes</button>
                </div>
             </form>
           </div>
        </div>
      )}

      {/* Header Back Button & Monetization Mini Badge */}
      <div className="px-4 md:px-8 xl:px-12 pt-6 flex justify-between items-center">
         <button onClick={() => navigate('/')} className="text-zinc-500 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium">
            <ChevronLeft className="w-5 h-5" /> Back to Home
         </button>
      </div>

      {/* Advanced Profile Section */}
      <div className="px-4 md:px-8 xl:px-12 py-10 flex flex-col gap-6 relative border-b border-white/5 overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
         
         <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-12 z-10">
            <button 
               onClick={() => {
                  setEditProfileForm({ name: creator.name, logo: creator.logo || '' });
                  setEditProfileOpen(true);
               }}
               className="p-3 sm:px-5 sm:py-2.5 bg-[#151515] hover:bg-[#222] text-zinc-300 hover:text-white rounded-full flex items-center gap-2 border border-white/10 transition-all shadow-xl hover:shadow-primary/10 hover:border-primary/30"
               title="Edit Profile"
            >
               <Edit3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary/80" />
               <span className="hidden sm:inline text-sm font-bold tracking-wide">Edit Profile</span>
            </button>
         </div>

         <div className="flex items-start gap-4 sm:gap-6 w-full relative z-10">
            {/* Logo */}
            <div 
               className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-primary/20 flex flex-col items-center justify-center text-primary font-bold text-2xl sm:text-3xl shrink-0 overflow-hidden border border-primary/20 shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.15)] transition-all"
            >
               {creator.logo ? <img src={creator.logo} className="w-full h-full object-cover" alt="" /> : creator.name?.charAt(0).toUpperCase()}
            </div>
            
            <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
               <div className="flex items-start sm:items-center justify-between w-full flex-col sm:flex-row gap-3">
                  <div className="min-w-0 flex-1 w-full pr-2">
                     <div className="flex items-center gap-2">
                       <h1 
                         className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate"
                       >
                          {creator.name}
                       </h1>
                       {stats.level >= 1 && (
                          <div title={`Level ${stats.level} Monetized`} className={cn("p-1 rounded-full", stats.level >= 2 ? "bg-blue-500/20 text-blue-500" : "bg-green-500/20 text-green-500")}>
                             <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                       )}
                     </div>
                     <div className="flex flex-wrap items-center gap-2 mt-0.5 sm:mt-1 text-xs sm:text-sm">
                       <span className="text-primary font-medium tracking-wide">@{creator.username}</span>
                       {stats.level > 0 && <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">Level {stats.level}</span>}
                     </div>
                  </div>
                  
                  {/* Floating Action CTA */}
                  {creator.affiliateUrl && (
                     <div className="w-full sm:w-auto">
                        <input 
                           type="text" 
                           placeholder="Button Label..."
                           className="hidden" 
                           id="hiddenBtnLabel" 
                        />
                        <button 
                          onClick={() => {
                             const newBtnLabel = window.prompt("Enter custom button label (or cancel):", creator.affiliateButtonName || "Open Link");
                             if (newBtnLabel) handleUpdateCreator("affiliateButtonName", newBtnLabel);
                             else if (newBtnLabel === null) window.open(creator.affiliateUrl, '_blank');
                          }}
                          className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-primary to-blue-600 text-white font-bold text-sm rounded-full hover:shadow-lg hover:shadow-primary/30 transition-all shrink-0 sm:ml-2 disabled:opacity-50 active:scale-95 border border-white/10 hover:brightness-110"
                        >
                          {creator.affiliateButtonName || "Open Link"}
                        </button>
                     </div>
                  )}
               </div>
               
               {/* Bio Line */}
               {creator.bio && (
                 <p 
                   onClick={() => setBioModalOpen(true)}
                   className="text-zinc-400 text-[13px] sm:text-sm truncate mt-3 cursor-pointer hover:text-zinc-300 w-full sm:max-w-2xl active:opacity-75 transition-opacity"
                 >
                   {creator.bio}
                 </p>
               )}
            </div>
         </div>
      </div>

      <div className="px-4 md:px-8 xl:px-12 pb-24 pt-4">
        {/* Tabs */}
        <div className="flex gap-6 mb-8 border-b border-white/10 items-center overflow-x-auto hide-scrollbar touch-pan-x">
           <button onClick={() => setActiveTab('dashboard')} className={cn("px-2 py-4 font-bold text-sm border-b-2 transition-colors whitespace-nowrap", activeTab === 'dashboard' ? "border-primary text-primary" : "border-transparent text-zinc-500 hover:text-white")}>Dashboard</button>
           <button onClick={() => setActiveTab('apps')} className={cn("px-2 py-4 font-bold text-sm border-b-2 transition-colors whitespace-nowrap", activeTab === 'apps' ? "border-primary text-primary" : "border-transparent text-zinc-500 hover:text-white")}>Apps</button>
           <button onClick={() => setActiveTab('earning_apps')} className={cn("px-2 py-4 font-bold text-sm border-b-2 transition-colors whitespace-nowrap", activeTab === 'earning_apps' ? "border-primary text-primary" : "border-transparent text-zinc-500 hover:text-white")}>Earning Apps</button>
           <button onClick={() => setActiveTab('products')} className={cn("px-2 py-4 font-bold text-sm border-b-2 transition-colors whitespace-nowrap", activeTab === 'products' ? "border-primary text-primary" : "border-transparent text-zinc-500 hover:text-white")}>Products</button>
           <button onClick={() => setActiveTab('about')} className={cn("px-2 py-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap", activeTab === 'about' ? "border-primary text-primary" : "border-transparent text-zinc-500 hover:text-white")}>
             <TrendingUp className="w-4 h-4"/> Channel Highlights
           </button>
        </div>

        {activeTab === 'about' && (
          <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
            <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 border border-white/5 p-6 rounded-3xl mb-4 text-center relative overflow-hidden">
               <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full" />
               <p className="text-zinc-400 text-sm font-bold uppercase tracking-wider mb-2 relative z-10">Channel Performance</p>
               <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 relative z-10">{stats.totalViews >= 1000 ? (stats.totalViews/1000).toFixed(1) + 'k' : stats.totalViews} Avg Views</h2>
               <p className="text-zinc-500 text-xs mt-2 relative z-10">Across all published items</p>
            </div>
            
            <h3 className="text-lg font-bold text-white px-2">Trending In Your Profile</h3>
            
            {trendingItems.length === 0 ? (
               <div className="text-center py-16 text-zinc-600 border border-white/10 rounded-2xl bg-[#111] shadow-sm">No content to showcase.</div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {trendingItems.map((req, idx, arr) => (
                   <div key={req.id} className="bg-[#111] border border-white/10 rounded-2xl p-5 hover:bg-[#151515] transition-all hover:border-white/20 hover:-translate-y-0.5 shadow-sm flex flex-col gap-4 relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-3 flex justify-end">
                       <span className="text-2xl font-bold text-white/5 italic w-12 text-right">#{idx + 1}</span>
                     </div>
                     <div className="flex items-center gap-4 min-w-0 relative z-10">
                       <img src={req.data?.logo || req.data?.productImage} className="w-14 h-14 sm:w-16 sm:h-16 rounded-[22%] object-cover bg-black shrink-0 border border-white/10 shadow-sm" alt="" />
                       <div className="flex-1 min-w-0 px-2 text-left">
                         <p className="text-white font-bold text-base truncate">{req.data?.name || req.data?.productName || 'Untitled'}</p>
                         <p className="text-zinc-500 text-xs mt-1 truncate capitalize font-medium">{req.data?.type?.replace('_', ' ')}</p>
                       </div>
                     </div>
                     
                     <div className="flex items-center gap-2 pt-3 border-t border-white/5 relative z-10">
                        <button onClick={() => handleEdit(req)} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors text-sm font-bold flex-1">
                          <Edit2 className="w-4 h-4" /> Edit
                        </button>
                        <button onClick={() => setDeleteConfirmReq(req)} className="flex items-center justify-center p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors shrink-0 px-4">
                          <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                   </div>
                 ))}
               </div>
            )}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="max-w-5xl space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatTile label="Followers" value={stats.totalFollowers} />
              <StatTile label="Downloads" value={stats.totalDownloads} />
              <StatTile label="Views" value={stats.totalViews} />
              <StatTile label="Uploads" value={stats.successfulUploads} />
            </div>

            <div className="pt-2">
              <h2 className="text-lg font-bold text-white mb-6">Monetization</h2>

              <div className="space-y-12">
                <div>
                  <div className="flex items-start sm:items-center justify-between mb-6 flex-col sm:flex-row gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        Level 1 
                        {stats.level >= 1 ? <StatusBadge status="approved" /> : stats.monetizationStatus === 'pending_l1' ? <StatusBadge status="pending" /> : null}
                      </h3>
                      <p className="text-sm text-zinc-400 mt-1">Unlocks 5x Uploads, Green Tick, and 1% Top Recommendation</p>
                    </div>
                    {stats.level < 1 && stats.monetizationStatus !== 'pending_l1' && (
                      <button 
                        onClick={() => handleApplyMonetization(1)}
                        disabled={!l1Eligible}
                        className="px-6 py-2 rounded-full font-bold text-sm transition-colors disabled:opacity-50 bg-primary text-primary-foreground"
                      >
                        Apply Now
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <CompactProgressBar label="Followers" current={stats.totalFollowers} target={l1Reqs.followers} progress={l1ProgressFollowers} />
                    <CompactProgressBar label="Downloads" current={stats.totalDownloads} target={l1Reqs.downloads} progress={l1ProgressDownloads} />
                    <CompactProgressBar label="Views" current={stats.totalViews} target={l1Reqs.views} progress={l1ProgressViews} />
                  </div>
                </div>

                <div className={stats.level < 1 && stats.monetizationStatus !== 'approved_l1' ? "opacity-40 pointer-events-none" : ""}>
                  <div className="flex items-start sm:items-center justify-between mb-6 flex-col sm:flex-row gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        Level 2
                        {stats.level >= 2 ? <StatusBadge status="approved" /> : stats.monetizationStatus === 'pending_l2' ? <StatusBadge status="pending" /> : null}
                      </h3>
                      <p className="text-sm text-zinc-400 mt-1">Unlocks 10x Uploads, Blue Tick, and 2% Top Recommendation</p>
                    </div>
                    {stats.level >= 1 && stats.level < 2 && stats.monetizationStatus !== 'pending_l2' && (
                      <button 
                        onClick={() => handleApplyMonetization(2)}
                        disabled={!l2Eligible}
                        className="px-6 py-2 rounded-full font-bold text-sm transition-colors disabled:opacity-50 bg-white text-black"
                      >
                        Apply Now
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <CompactProgressBar label="Followers" current={stats.totalFollowers} target={l2Reqs.followers} progress={l2ProgressFollowers} />
                    <CompactProgressBar label="Downloads" current={stats.totalDownloads} target={l2Reqs.downloads} progress={l2ProgressDownloads} />
                    <CompactProgressBar label="Views" current={stats.totalViews} target={l2Reqs.views} progress={l2ProgressViews} />
                  </div>
                </div>

                <div className={stats.level < 2 && stats.monetizationStatus !== 'approved_l2' ? "opacity-40 pointer-events-none" : ""}>
                  <div className="flex items-start sm:items-center justify-between mb-6 flex-col sm:flex-row gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        Level 3 (Business Partner)
                        {stats.level >= 3 ? <StatusBadge status="approved" /> : null}
                      </h3>
                      <p className="text-sm text-zinc-400 mt-1">Unlocks Business Partner status, Rewards, and 20x Uploads. (Admin Approval Only)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <CompactProgressBar label="Followers" current={stats.totalFollowers} target={l3Reqs.followers} progress={l3ProgressFollowers} />
                    <CompactProgressBar label="Downloads" current={stats.totalDownloads} target={l3Reqs.downloads} progress={l3ProgressDownloads} />
                    <CompactProgressBar label="Views" current={stats.totalViews} target={l3Reqs.views} progress={l3ProgressViews} />
                  </div>
                </div>
              </div>
            </div>
            
            {stats.level >= 2 && (
              <div className="pt-8 border-t border-white/10">
                <h3 className="text-lg font-bold text-white mb-2">Display Controls</h3>
                <p className="text-zinc-400 text-sm mb-4">You have Level 2 access. Manage featured placements and prioritize your content visibility.</p>
                <div className="text-zinc-500 text-sm bg-white/5 py-4 px-6 rounded-xl border border-white/5 inline-block">
                  Priority controls active.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dynamic Items Tabs (Apps, Earning Apps, Products) */}
        {['apps', 'earning_apps', 'products'].includes(activeTab) && (
          <div className="max-w-5xl">
            <div className="flex justify-between items-center mb-6 px-1">
              <div>
                 <h2 className="text-xl font-bold text-white capitalize">{activeTab.replace('_', ' ')}</h2>
                 <p className="text-xs text-zinc-500 mt-1">
                    {requests.filter(req => (req.data?.type || 'apps') === activeTab).length} / {activeTab === 'apps' ? 8 : (activeTab === 'earning_apps' ? 7 : 5)} Uploaded
                 </p>
              </div>
              <button 
                onClick={() => { setSubmitData({ type: activeTab }); setShowSubmitModal(true); }} 
                className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 text-primary font-bold text-sm border border-primary/20 rounded-full hover:bg-primary/20 hover:scale-105 active:scale-95 transition-all"
                title={`Upload ${activeTab.replace('_', ' ')}`}
              >
                <Plus className="w-4 h-4"/> <span className="hidden sm:inline">Upload New</span>
              </button>
            </div>

            {requests.filter(req => (req.data?.type || 'apps') === activeTab).length === 0 ? (
               <div className="border border-white/10 rounded-3xl overflow-hidden shadow-sm">
                 <div className="text-center py-20 text-zinc-500 bg-[#111]">
                    No {activeTab.replace('_', ' ')} uploaded yet.
                 </div>
               </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {requests.filter(req => (req.data?.type || 'apps') === activeTab).map((req, idx, arr) => (
                   <div key={req.id} className="bg-[#111] border border-white/10 rounded-2xl p-5 hover:bg-[#151515] transition-all hover:border-white/20 hover:-translate-y-0.5 shadow-sm flex flex-col gap-4">
                     <div className="flex items-center gap-4 min-w-0">
                       <img src={req.data?.logo || req.data?.productImage} className="w-14 h-14 sm:w-16 sm:h-16 rounded-[22%] object-cover bg-black shrink-0 border border-white/10 shadow-sm" alt="" />
                       <div className="flex-1 min-w-0 text-left">
                         <p className="text-white font-bold text-base truncate">{req.data?.name || req.data?.productName || 'Untitled'}</p>
                         <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                           <StatusBadge status={req.status} className="!py-0.5 !px-2 !text-[9px]" />
                           <span className="text-zinc-500 text-[11px] truncate">{req.createdAt?.toDate().toLocaleDateString()}</span>
                         </div>
                       </div>
                     </div>
                     
                     <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                        <button onClick={() => handleEdit(req)} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors text-sm font-bold flex-1">
                          <Edit2 className="w-4 h-4" /> Edit
                        </button>
                        <button onClick={() => setDeleteConfirmReq(req)} className="flex items-center justify-center p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors shrink-0 px-4">
                          <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                   </div>
                 ))}
               </div>
            )}
          </div>
        )}

      </div>

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className="absolute inset-0 z-50 bg-[#000] min-h-screen flex flex-col animate-in fade-in pb-24 px-4 sm:px-6">
          <div className="w-full max-w-3xl mx-auto py-8 sm:py-12">
            <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
              <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">{submitData.id ? 'Edit Item' : 'New Submission'}</h2>
                <p className="text-zinc-400 mt-2 text-sm">{submitData.id ? 'Upload new icons or edit properties. Changes are saved and updated in real-time.' : 'Fill out the details below to submit for review.'}</p>
              </div>
              <button 
                 onClick={() => setShowSubmitModal(false)} 
                 className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitApp} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider px-1">Type</label>
                  <select disabled={!!submitData.id} className="p-4 rounded-2xl bg-[#111] border border-white/10 text-white font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all disabled:opacity-50" value={submitData.type} onChange={e => setSubmitData({...submitData, type: e.target.value})}>
                    <option value="apps">Apps/Software</option>
                    <option value="earning_apps">Earning Apps</option>
                    <option value="products">Physical Products</option>
                  </select>
                </div>

                {submitData.type === 'products' ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider px-1">Product Name</label>
                        <input required placeholder="Short name" className="p-4 rounded-2xl bg-[#111] border border-white/10 text-white focus:ring-2 focus:ring-primary transition-all" value={submitData.productName || ''} onChange={e => setSubmitData({...submitData, productName: e.target.value})} />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider px-1">Tagline</label>
                        <input required placeholder="Short description line..." className="p-4 rounded-2xl bg-[#111] border border-white/10 text-white focus:ring-2 focus:ring-primary transition-all" value={submitData.productTitle || ''} onChange={e => setSubmitData({...submitData, productTitle: e.target.value})} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider px-1">Primary Image</label>
                      <FileUpload path="requests" onUploadComplete={(url) => setSubmitData({...submitData, productImage: Array.isArray(url) ? url[0] : url})}/>
                      {submitData.productImage && <img src={submitData.productImage} className="h-24 w-24 object-cover rounded-[22%] border border-white/10 mt-2 shadow-lg" alt="Preview"/>}
                    </div>
                    <div className="flex flex-col gap-2">
                       <label className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider px-1">Product Brand Logo (Optional)</label>
                      <FileUpload path="requests" onUploadComplete={(url) => setSubmitData({...submitData, logo: Array.isArray(url) ? url[0] : url})}/>
                      {submitData.logo && <img src={submitData.logo} className="h-24 w-24 object-cover rounded-[22%] border border-white/10 mt-2 shadow-lg" alt="Preview"/>}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider px-1">App Name</label>
                        <input required placeholder="Short name" className="p-4 rounded-2xl bg-[#111] border border-white/10 text-white focus:ring-2 focus:ring-primary transition-all" value={submitData.name || ''} onChange={e => setSubmitData({...submitData, name: e.target.value})} />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider px-1">Tagline</label>
                        <input required placeholder="Short description line..." className="p-4 rounded-2xl bg-[#111] border border-white/10 text-white focus:ring-2 focus:ring-primary transition-all" value={submitData.title || ''} onChange={e => setSubmitData({...submitData, title: e.target.value})} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider px-1">App Icon</label>
                      <FileUpload path="requests" onUploadComplete={(url) => setSubmitData({...submitData, logo: Array.isArray(url) ? url[0] : url})}/>
                      {submitData.logo && <img src={submitData.logo} className="h-24 w-24 object-cover rounded-[22%] border border-white/10 mt-2 shadow-lg" alt="Preview"/>}
                    </div>
                  </>
                )}
                
                <div className="flex flex-col gap-2">
                  <label className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider px-1">Long Description</label>
                  <textarea required placeholder="Detailed description..." rows={5} className="p-4 rounded-2xl bg-[#111] border border-white/10 text-white focus:ring-2 focus:ring-primary resize-y" value={submitData.description || ''} onChange={e => setSubmitData({...submitData, description: e.target.value})} />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider px-1">Download / Referral Link</label>
                  <input required placeholder="https://..." className="p-4 rounded-2xl bg-[#111] border border-white/10 text-white focus:ring-2 focus:ring-primary" value={submitData.link || submitData.referralLink || submitData.affiliateLink || ''} onChange={e => setSubmitData({...submitData, link: e.target.value})} />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider px-1">Gallery Media</label>
                  <FileUpload path="requests" multiple onUploadComplete={(urls) => {
                     let existing = [];
                     const key = submitData.type === 'products' ? 'productImages' : 'screenshots';
                     if (Array.isArray(submitData[key])) { existing = submitData[key]; }
                     const newUrls = Array.isArray(urls) ? urls : [urls];
                     setSubmitData({...submitData, [key]: [...existing, ...newUrls]});
                  }}/>
                  <textarea placeholder="Or paste multiple URLs (one per line)..." rows={3} className="mt-2 p-4 rounded-2xl bg-[#111] border border-white/10 text-white text-sm focus:ring-2 focus:ring-primary resize-y" value={Array.isArray(submitData[submitData.type === 'products' ? 'productImages' : 'screenshots']) ? submitData[submitData.type === 'products' ? 'productImages' : 'screenshots'].join('\n') : ''} onChange={e => setSubmitData({...submitData, [submitData.type === 'products' ? 'productImages' : 'screenshots']: e.target.value.split('\n')})} />
                </div>

                <button disabled={submitting} type="submit" className="w-full mt-6 bg-white text-black font-bold text-lg py-5 rounded-2xl hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center shadow-xl">
                  {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : (submitData.id ? 'Save Changes' : 'Submit for Review')}
                </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="bg-[#111] px-4 py-3 sm:px-6 sm:py-5 rounded-3xl border border-white/5 flex flex-col justify-center">
       <p className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wide mb-1">{label}</p>
       <span className="text-xl sm:text-3xl font-bold text-white">{value}</span>
    </div>
  );
}

function CompactProgressBar({ label, current, target, progress }: { label: string, current: number, target: number, progress: number }) {
  return (
    <div className="w-full flex flex-col justify-center">
       <div className="flex justify-between items-end mb-1.5">
          <span className="text-sm font-medium text-zinc-300">{label}</span>
          <span className="text-xs text-zinc-500">
             <span className={progress >= 100 ? "text-green-400 font-bold" : "text-white"}>{current.toLocaleString()}</span> / {target.toLocaleString()}
          </span>
       </div>
       <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <div 
             className={cn("h-full transition-all duration-1000", progress >= 100 ? "bg-green-500" : "bg-primary")}
             style={{ width: `${progress}%` }}
          />
       </div>
    </div>
  );
}

function StatusBadge({ status, className }: { status: string, className?: string }) {
   if (status === 'approved' || status.startsWith('approved')) {
     return <span className={cn("inline-flex justify-center items-center px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded border border-green-500/20 text-green-500 bg-green-500/10", className)}>Approved</span>;
   }
   if (status === 'pending' || status.startsWith('pending')) {
     return <span className={cn("inline-flex justify-center items-center px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded border border-yellow-500/20 text-yellow-500 bg-yellow-500/10", className)}>Pending</span>;
   }
   if (status === 'rejected') {
     return <span className={cn("inline-flex justify-center items-center px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded border border-red-500/20 text-red-500 bg-red-500/10", className)}>Rejected</span>;
   }
   return null;
}

