import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, collection, getCountFromServer, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAppStore } from '../../lib/store';
import { Settings, Announcement } from '../../types';
import FileUpload from '../../components/admin/FileUpload';
import { AlertTriangle, Database, Trash2, RefreshCw } from 'lucide-react';

export default function AdminSettingsPage() {
  const { settings, announcement } = useAppStore();
  const [localSettings, setLocalSettings] = useState<Partial<Settings>>({ searchEnabled: true, promoterSecretCode: 'amitkumar' });
  const [localPopup, setLocalPopup] = useState<Partial<Announcement>>({ enabled: false });
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Database Stats
  const [dbStats, setDbStats] = useState<{ totalDocs: number, breakdown: Record<string, number> } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetPassword, setResetPassword] = useState('');

  const targetCollections = [
    'apps', 'earning_apps', 'products', 'ads', 'promoters', 
    'creator_requests', 'monetization_requests', 'about_sections', 
    'ratings', 'promoter_links', 'verification_sessions'
  ];

  const fetchDbStats = async () => {
     setLoadingStats(true);
     try {
        let total = 0;
        let breakdown: Record<string, number> = {};
        for(const col of targetCollections) {
           const countSnap = await getCountFromServer(collection(db, col));
           breakdown[col] = countSnap.data().count;
           total += breakdown[col];
        }
        setDbStats({ totalDocs: total, breakdown });
     } catch(e) {
        console.error("Error fetching db stats", e);
     } finally {
        setLoadingStats(false);
     }
  };

  useEffect(() => {
    if (settings) {
      setLocalSettings({ promoterSecretCode: 'amitkumar', ...settings });
    }
    if (announcement) setLocalPopup(announcement);
  }, [settings, announcement]);

  useEffect(() => {
     fetchDbStats();
     const interval = setInterval(fetchDbStats, 30000); // Live update every 30s
     return () => clearInterval(interval);
  }, []);

  async function hashPassword(msg: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(msg);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setDoc(doc(db, 'settings', 'global'), { ...localSettings, updatedAt: serverTimestamp() }, { merge: true }).catch(err => console.error(err));
    alert("Settings saved!");
  };

  const handleSavePopup = (e: React.FormEvent) => {
    e.preventDefault();
    setDoc(doc(db, 'announcements', 'global'), { ...localPopup, updatedAt: serverTimestamp() }, { merge: true }).catch(err => console.error(err));
    alert("Popup saved!");
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setSaving(true);
    try {
      const hash = await hashPassword(password);
      await setDoc(doc(db, 'admin_auth', 'config'), { passwordHash: hash });
      alert("Password updated successfully!");
      setPassword('');
    } catch(err: any) { alert(err.message); } finally { setSaving(false); }
  };

  const handleFactoryReset = async (e: React.FormEvent) => {
     e.preventDefault();
     if (resetPassword !== 'RESET123') {
        alert("Incorrect confirmation code.");
        return;
     }

     if (!window.confirm("WARNING: This will permanently deploy all website data across all collections. Are you absolutely sure?")) return;

     setResetting(true);
     try {
        for(const col of targetCollections) {
           const querySnapshot = await getDocs(collection(db, col));
           let batch = writeBatch(db);
           let count = 0;
           
           for (const docSnap of querySnapshot.docs) {
              batch.delete(docSnap.ref);
              count++;
              // Commit in batches of 500
              if (count === 500) {
                 await batch.commit();
                 batch = writeBatch(db);
                 count = 0;
              }
           }
           if (count > 0) {
              await batch.commit();
           }
        }
        alert("Factory reset complete. All content has been erased.");
        setResetPassword('');
        fetchDbStats();
     } catch (err: any) {
        alert("Error during factory reset: " + err.message);
     } finally {
        setResetting(false);
     }
  };

  // rough estimate of size based on counts (assume 1.5kb per doc average)
  const approxSizeKB = dbStats ? (dbStats.totalDocs * 1.5).toFixed(2) : "0.00";

  return (
    <div className="max-w-4xl flex flex-col gap-12 pb-12">
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-[#111] p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2">
               <div className="w-10 h-10 bg-primary/20 text-primary rounded-xl flex items-center justify-center">
                  <Database className="w-5 h-5" />
               </div>
               <div>
                 <h2 className="text-xl font-bold">Database Usage</h2>
                 <p className="text-xs text-zinc-400">Live storage statistics</p>
               </div>
               <button onClick={fetchDbStats} className="ml-auto p-2 hover:bg-white/5 rounded-full transition-colors" disabled={loadingStats} title="Refresh Stats">
                  <RefreshCw className={`w-4 h-4 text-zinc-400 ${loadingStats ? 'animate-spin' : ''}`} />
               </button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-black/50 rounded-xl border border-white/5">
                <div>
                   <p className="text-sm text-zinc-400 mb-1">Total Documents</p>
                   <p className="text-3xl font-bold">{dbStats ? dbStats.totalDocs : '...'}</p>
                </div>
                <div className="text-right">
                   <p className="text-sm text-zinc-400 mb-1">Est. Size</p>
                   <p className="text-2xl font-semibold text-primary">~{approxSizeKB} KB</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
               {dbStats?.breakdown && Object.entries(dbStats.breakdown).map(([col, count]) => (
                  count > 0 && <div key={col} className="flex items-center justify-between p-3 bg-white/5 rounded-lg text-xs">
                     <span className="text-zinc-400 uppercase tracking-wider">{col.replace('_', ' ')}</span>
                     <span className="font-mono font-bold text-white">{count}</span>
                  </div>
               ))}
            </div>
         </div>

         <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/20 flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2">
               <div className="w-10 h-10 bg-red-500/20 text-red-500 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
               </div>
               <div>
                 <h2 className="text-xl font-bold text-red-500">Factory Reset</h2>
                 <p className="text-xs text-red-400">Permanently erase all data</p>
               </div>
            </div>
            
            <p className="text-sm text-red-300">
               This action is irreversible. All apps, earning apps, creator requests, promoters, popup banners, ads, ratings and links will be permanently deleted from the database.
            </p>

            <form onSubmit={handleFactoryReset} className="flex flex-col gap-3 mt-auto">
               <input 
                 required 
                 placeholder="Type 'RESET123' to confirm" 
                 value={resetPassword}
                 onChange={e => setResetPassword(e.target.value)}
                 className="p-3 rounded-xl bg-black border border-red-500/30 text-white placeholder-red-500/50" 
               />
               <button 
                  disabled={resetting || resetPassword !== 'RESET123'} 
                  type="submit" 
                  className="flex items-center justify-center gap-2 w-full py-3 bg-red-500 hover:bg-red-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium rounded-xl transition-colors"
               >
                  {resetting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                  {resetting ? 'Erasing Database...' : 'Erase All Data'}
               </button>
            </form>
         </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Website Settings</h2>
        <form onSubmit={handleSaveSettings} className="flex flex-col gap-5 bg-[#111] p-6 rounded-2xl border border-white/5">
          <label className="flex flex-col gap-1 text-sm text-zinc-400">
            Website Name
            <input required className="w-full p-3 rounded-xl bg-black border border-white/10 text-white" value={localSettings.websiteName || ''} onChange={e => setLocalSettings({...localSettings, websiteName: e.target.value})} />
          </label>
          <div className="flex flex-col gap-2 p-4 bg-black/50 border border-white/5 rounded-xl">
             <label className="text-sm text-zinc-400 font-medium">Logo URL</label>
             <input placeholder="Image URL (Manual entry)" className="w-full p-3 rounded-xl bg-[#111] border border-white/10 text-white text-sm" value={localSettings.logoUrl || ''} onChange={e => setLocalSettings({...localSettings, logoUrl: e.target.value})} />
             <FileUpload path="settings" onUploadComplete={(url) => setLocalSettings({...localSettings, logoUrl: Array.isArray(url) ? url[0] : url})}/>
          </div>
          <label className="flex flex-col gap-1 text-sm text-zinc-400">
            Accent Color (e.g. #3b82f6)
            <input className="w-full p-3 rounded-xl bg-black border border-white/10 text-white" value={localSettings.accentColor || ''} onChange={e => setLocalSettings({...localSettings, accentColor: e.target.value})} />
          </label>
          <label className="flex items-center gap-3 text-sm text-white font-medium cursor-pointer p-4 bg-black/50 border border-white/5 rounded-xl">
            <input type="checkbox" checked={!!localSettings.searchEnabled} onChange={e => setLocalSettings({...localSettings, searchEnabled: e.target.checked})} className="w-5 h-5 accent-primary" />
            Enable Global Search
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-400">
            Promoter Secret Code (Long Press Header to enter)
            <input required className="w-full p-3 rounded-xl bg-black border border-white/10 text-white" value={localSettings.promoterSecretCode || ''} onChange={e => setLocalSettings({...localSettings, promoterSecretCode: e.target.value})} />
          </label>
          <button disabled={saving} type="submit" className="mt-2 px-8 py-3 bg-gradient-btn text-white font-medium rounded-xl self-start disabled:opacity-50 transition-colors">Save Settings</button>
        </form>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Popup Announcement</h2>
        <form onSubmit={handleSavePopup} className="flex flex-col gap-5 bg-[#111] p-6 rounded-2xl border border-white/5">
          <label className="flex items-center gap-3 text-sm text-white font-medium cursor-pointer p-4 bg-black/50 border border-white/5 rounded-xl">
            <input type="checkbox" checked={!!localPopup.enabled} onChange={e => setLocalPopup({...localPopup, enabled: e.target.checked})} className="w-5 h-5 accent-purple-500" />
            Enable Popup
          </label>
          {localPopup.enabled && (
             <div className="flex flex-col gap-5 animate-in fade-in duration-300">
               <label className="flex flex-col gap-1 text-sm text-zinc-400">
                 Title
                 <input required={!!localPopup.enabled} className="w-full p-3 rounded-xl bg-black border border-white/10 text-white" value={localPopup.title || ''} onChange={e => setLocalPopup({...localPopup, title: e.target.value})} />
               </label>
               <label className="flex flex-col gap-1 text-sm text-zinc-400">
                 Description
                 <textarea className="w-full p-3 rounded-xl bg-black border border-white/10 text-white" value={localPopup.description || ''} onChange={e => setLocalPopup({...localPopup, description: e.target.value})} />
               </label>
               <div className="flex flex-col gap-2 p-4 bg-black/50 border border-white/5 rounded-xl">
                 <label className="text-sm text-zinc-400 font-medium">Image URL</label>
                 <input placeholder="Image URL (Manual entry)" className="w-full p-3 rounded-xl bg-[#111] border border-white/10 text-white text-sm" value={localPopup.image || ''} onChange={e => setLocalPopup({...localPopup, image: e.target.value})} />
                 <FileUpload path="announcements" onUploadComplete={(url) => setLocalPopup({...localPopup, image: Array.isArray(url) ? url[0] : url})}/>
               </div>
               <label className="flex flex-col gap-1 text-sm text-zinc-400">
                 Target Link
                 <input className="w-full p-3 rounded-xl bg-black border border-white/10 text-white" value={localPopup.link || ''} onChange={e => setLocalPopup({...localPopup, link: e.target.value})} />
               </label>
             </div>
          )}
          <button disabled={saving} type="submit" className="mt-2 px-8 py-3 bg-gradient-btn text-white font-medium rounded-xl self-start disabled:opacity-50 transition-colors">Save Popup</button>
        </form>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Security</h2>
        <form onSubmit={handleSavePassword} className="flex flex-col gap-4 bg-[#111] p-6 rounded-2xl border border-white/5">
          <label className="flex flex-col gap-1 text-sm text-zinc-400">
            Change Admin Password (Step 1 PIN)
            <input type="password" required minLength={6} className="p-3 rounded-xl bg-black border border-white/10 text-white" value={password} onChange={e => setPassword(e.target.value)} />
          </label>
          <button disabled={saving} type="submit" className="mt-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl self-start transition-colors disabled:opacity-50">Update Password</button>
        </form>
      </section>
    </div>
  );
}
