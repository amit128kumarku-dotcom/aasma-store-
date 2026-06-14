import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Edit2, Trash2, Plus, X, Link as LinkIcon, Target, MousePointer2, CheckCircle2, AlertCircle, BarChart3 } from 'lucide-react';

export default function AdminAdsPage() {
  const [ads, setAds] = useState<any[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [form, setForm] = useState({
    id: '',
    buttonName: '',
    link: '',
    information: '',
    target: 'website' // 'website' or 'creator'
  });

  useEffect(() => {
    const q = query(collection(db, 'ads'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const adsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAds(adsData);
    });
    return () => unsub();
  }, []);

  const handleOpenForm = (ad?: any) => {
    if (ad) {
      setForm({
        id: ad.id,
        buttonName: ad.buttonName || '',
        link: ad.link || '',
        information: ad.information || '',
        target: ad.target || 'website'
      });
    } else {
      setForm({ id: '', buttonName: '', link: '', information: '', target: 'website' });
    }
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (form.id) {
        // Edit existing
        await updateDoc(doc(db, 'ads', form.id), {
          buttonName: form.buttonName,
          link: form.link,
          information: form.information,
          target: form.target,
          updatedAt: serverTimestamp()
        });
      } else {
        // Create new
        const newRef = doc(collection(db, 'ads'));
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days valid
        
        await setDoc(newRef, {
          buttonName: form.buttonName,
          link: form.link,
          information: form.information,
          target: form.target,
          createdAt: serverTimestamp(),
          expiresAt: Timestamp.fromDate(expiresAt),
          clicks: 0,
          success: 0,
          failed: 0
        });
      }
      setIsFormOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save ad.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this ad?")) {
      try {
        await deleteDoc(doc(db, 'ads', id));
      } catch (err) {
        alert("Failed to delete ad.");
      }
    }
  };

  const totalClicks = ads.reduce((acc, ad) => acc + (ad.clicks || 0), 0);
  const totalSuccess = ads.reduce((acc, ad) => acc + (ad.success || 0), 0);
  const totalFailed = ads.reduce((acc, ad) => acc + (ad.failed || 0), 0);

  return (
    <div className="flex flex-col gap-6 relative">
      <div className="flex justify-between items-center sm:items-start flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Ads Management</h1>
          <p className="text-zinc-500 text-sm">Create and manage locker ads for the website and creator profiles.</p>
        </div>
        <button 
          onClick={() => handleOpenForm()}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold transition-colors shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Create Ad
        </button>
      </div>

      {/* 3D Real-time Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
        <div className="bg-gradient-to-br from-blue-500/20 to-[#111] border border-blue-500/30 rounded-2xl p-6 relative overflow-hidden shadow-[0_10px_30px_rgba(59,130,246,0.1)] transition-transform hover:-translate-y-1">
           <div className="absolute top-0 right-0 p-4 opacity-10"><MousePointer2 className="w-16 h-16" /></div>
           <p className="text-blue-400 font-bold mb-2 flex items-center gap-2"><MousePointer2 className="w-4 h-4"/> Total Clicks</p>
           <h3 className="text-4xl font-extrabold text-white tracking-tight">{totalClicks}</h3>
        </div>
        <div className="bg-gradient-to-br from-green-500/20 to-[#111] border border-green-500/30 rounded-2xl p-6 relative overflow-hidden shadow-[0_10px_30px_rgba(34,197,94,0.1)] transition-transform hover:-translate-y-1">
           <div className="absolute top-0 right-0 p-4 opacity-10"><CheckCircle2 className="w-16 h-16" /></div>
           <p className="text-green-400 font-bold mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Successful (Completed)</p>
           <h3 className="text-4xl font-extrabold text-white tracking-tight">{totalSuccess}</h3>
        </div>
        <div className="bg-gradient-to-br from-red-500/20 to-[#111] border border-red-500/30 rounded-2xl p-6 relative overflow-hidden shadow-[0_10px_30px_rgba(239,68,68,0.1)] transition-transform hover:-translate-y-1">
           <div className="absolute top-0 right-0 p-4 opacity-10"><AlertCircle className="w-16 h-16" /></div>
           <p className="text-red-400 font-bold mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Failed Attempts</p>
           <h3 className="text-4xl font-extrabold text-white tracking-tight">{totalFailed}</h3>
        </div>
      </div>

      {isFormOpen && (
        <div className="bg-[#111] p-6 rounded-2xl border border-white/10 shadow-xl animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">{form.id ? 'Edit Ad' : 'Create New Ad'}</h2>
            <button onClick={() => setIsFormOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-zinc-400">Button Name</label>
              <input 
                required 
                placeholder="e.g. Subscribe Now"
                value={form.buttonName} 
                onChange={e => setForm({...form, buttonName: e.target.value})} 
                className="p-3 rounded-xl bg-black border border-white/10 focus:border-primary text-white" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-zinc-400">Link URL</label>
              <input 
                required 
                type="url"
                placeholder="https://..."
                value={form.link} 
                onChange={e => setForm({...form, link: e.target.value})} 
                className="p-3 rounded-xl bg-black border border-white/10 focus:border-primary text-white" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-zinc-400">Information (Description)</label>
              <textarea 
                required 
                placeholder="Enter instructions or description for the user..."
                value={form.information} 
                onChange={e => setForm({...form, information: e.target.value})} 
                className="p-3 rounded-xl bg-black border border-white/10 focus:border-primary text-white min-h-[100px]" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-zinc-400">Target Audience</label>
              <select 
                value={form.target} 
                onChange={e => setForm({...form, target: e.target.value})} 
                className="p-3 rounded-xl bg-black border border-white/10 focus:border-primary text-white"
              >
                <option value="website">Website (Global Locker)</option>
                <option value="creator">Creator Profile / App Upload</option>
              </select>
            </div>
            
            <div className="flex gap-3 mt-4">
               <button type="submit" className="flex-1 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold transition-colors text-lg">
                 {form.id ? 'Save Changes' : 'Create Ad'}
               </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ads.map(ad => {
          const isExpired = ad.expiresAt && new Date() > ad.expiresAt.toDate();
          
          return (
            <div key={ad.id} className={`bg-[#111] border rounded-2xl p-5 flex flex-col gap-4 transition-all hover:border-white/20 relative overflow-hidden ${isExpired ? 'border-red-500/20 opacity-60 bg-red-500/5' : 'border-white/10'}`}>
              {isExpired && (
                 <div className="absolute top-0 right-0 bg-red-500/80 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                   EXPIRED
                 </div>
              )}
              <div className="flex justify-between items-start">
                <div className="flex bg-white/5 border border-white/10 rounded-full px-3 py-1 items-center gap-1.5 w-fit">
                   <Target className="w-3.5 h-3.5 text-zinc-400" />
                   <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">{ad.target}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenForm(ad)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(ad.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                 <h3 className="text-lg font-bold text-white line-clamp-1">{ad.buttonName}</h3>
                 <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                   <LinkIcon className="w-3 h-3 shrink-0" />
                   <span className="truncate">{ad.link}</span>
                 </div>
              </div>

              <p className="text-zinc-400 text-sm line-clamp-3 leading-relaxed bg-black/50 p-3 rounded-lg border border-white/5">
                {ad.information}
              </p>

              {/* Individual Ad Stats */}
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div className="bg-black/50 rounded-lg p-2 flex flex-col items-center justify-center border border-white/5">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><MousePointer2 className="w-3 h-3"/> Clicks</span>
                  <span className="text-white font-bold">{ad.clicks || 0}</span>
                </div>
                <div className="bg-green-500/10 rounded-lg p-2 flex flex-col items-center justify-center border border-green-500/20">
                  <span className="text-[10px] text-green-500/70 uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Success</span>
                  <span className="text-green-400 font-bold">{ad.success || 0}</span>
                </div>
                <div className="bg-red-500/10 rounded-lg p-2 flex flex-col items-center justify-center border border-red-500/20">
                  <span className="text-[10px] text-red-500/70 uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Failed</span>
                  <span className="text-red-400 font-bold">{ad.failed || 0}</span>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-1">
                 <div className="flex justify-between text-xs text-zinc-500">
                   <span>Created:</span>
                   <span>{ad.createdAt?.toDate().toLocaleDateString() || 'Just now'}</span>
                 </div>
                 {ad.expiresAt && (
                   <div className="flex justify-between text-xs text-zinc-500">
                     <span>Expires:</span>
                     <span className={isExpired ? 'text-red-400 font-bold' : ''}>{ad.expiresAt.toDate().toLocaleDateString()}</span>
                   </div>
                 )}
              </div>
            </div>
          );
        })}
      </div>
      
      {ads.length === 0 && (
         <div className="col-span-full py-12 text-center bg-[#111] border border-white/5 rounded-2xl">
           <p className="text-zinc-500">No ads created yet.</p>
         </div>
      )}
    </div>
  );
}
