import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useParams, useSearchParams } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../../lib/firestore-error';
import { Check, X, User } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function AdminItemsPage({ collectionName, itemTypeLabel }: { collectionName: string, itemTypeLabel: string }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<any | null>(null);

  useEffect(() => {
    // Fetch pending requests without strict small limit, to ensure we don't miss items of a specific type.
    const q = query(
       collection(db, 'creator_requests'),
       where('status', '==', 'pending')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach(doc => {
        const item = { id: doc.id, ...doc.data() } as any;
        if ((item.data?.type || 'apps') === collectionName) {
          data.push(item);
        }
      });
      // Sort in memory to avoid needing composite index for status + createdAt
      data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setRequests(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'creator_requests');
    });
    return () => unsub();
  }, [collectionName]);

  const handleApprove = async (req: any) => {
    try {
      const { getDoc } = await import('firebase/firestore');
      const promoterDoc = await getDoc(doc(db, 'promoters', req.creatorId));
      const creatorLevel = promoterDoc.exists() ? (promoterDoc.data().level || 0) : 0;

      await setDoc(doc(db, collectionName, req.id), {
        ...req.data,
        creatorId: req.creatorId,
        creatorName: req.creatorName,
        creatorLevel: creatorLevel,
        status: 'approved',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'creator_requests', req.id), { status: 'approved' });
      setSelectedReq(null);
    } catch (e: any) {
      console.error(e);
      alert("Failed to approve item: " + e.message);
    }
  };

  const handleReject = async (req: any) => {
    try {
      await updateDoc(doc(db, 'creator_requests', req.id), { status: 'rejected' });
      setSelectedReq(null);
    } catch (e: any) {
      console.error(e);
      alert("Failed to reject item: " + e.message);
    }
  };

  const handleDelete = async (req: any) => {
    if (!window.confirm("Delete this request entirely?")) return;
    try {
      await deleteDoc(doc(db, 'creator_requests', req.id));
      await deleteDoc(doc(db, collectionName, req.id)).catch(() => {});
    } catch (e: any) {
      console.error(e);
      alert("Failed to delete item: " + e.message);
    }
  };

  const isProduct = collectionName === 'products';

  if (selectedReq) {
    const data = selectedReq.data || {};
    const logoUrl = data.logo || (isProduct ? data.productImage : null);
    const name = isProduct ? data.productName : data.name;
    const title = isProduct ? data.productTitle : data.title;
    const links = (data.additionalLinks || []).concat(data.referralLink ? [data.referralLink] : []).concat(data.affiliateLink ? [data.affiliateLink] : []).concat(data.link ? [data.link] : []);
    const mainLink = links.length > 0 ? links[0] : null;
    const screenshots = isProduct ? data.productImages : data.screenshots;

    return (
      <div className="w-full flex justify-center animate-in fade-in pb-24 px-4 sm:px-6">
        <div className="w-full max-w-3xl flex flex-col gap-6">
          
          <div className="flex justify-between items-center pb-4 border-b border-white/10 mt-2">
             <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Review Submission</h2>
             <button onClick={() => setSelectedReq(null)} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors">
               <X className="w-6 h-6" />
             </button>
          </div>

          <div className="flex flex-col gap-8">
            
            {/* SECTION 1: Top Row */}
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <img src={logoUrl} alt={name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover bg-black border border-white/10 shrink-0" />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/5 border border-white/10 shrink-0 flex items-center justify-center">
                  <User className="w-8 h-8 text-zinc-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">{name || 'Unnamed'}</h1>
                <p className="text-sm font-medium text-zinc-300 truncate mt-1">{selectedReq.creatorName}</p>
                <p className="text-[10px] sm:text-xs text-zinc-500 truncate">ID: {selectedReq.creatorId}</p>
              </div>
            </div>

            {/* SECTION 2: Title & Description */}
            <div className="flex flex-col gap-4">
               <p className="text-base sm:text-lg text-zinc-200 font-medium leading-snug">{title}</p>
               {data.description && (
                 <p className="text-sm text-zinc-400 whitespace-pre-wrap leading-relaxed">{data.description}</p>
               )}
            </div>

            {/* SECTION 3: Download Button */}
            {mainLink && (
              <div>
                <a href={mainLink} target="_blank" rel="noreferrer" className="w-full flex justify-center items-center px-6 py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors text-base">
                  {isProduct ? 'Buy Now' : 'Download Now'}
                </a>
              </div>
            )}

            {/* SECTION 4: Screenshots */}
            {screenshots && screenshots.length > 0 && (
              <div className="pt-2">
                <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
                  {screenshots.map((s: string, i: number) => (
                    <img key={i} src={s} alt={`screenshot ${i}`} className="h-64 sm:h-80 w-auto object-contain rounded-xl border border-white/10 shrink-0 snap-center bg-black" />
                  ))}
                </div>
              </div>
            )}
            
          </div>

          {/* SECTION 5: Action Bar */}
          <div className="flex gap-4 pt-6 border-t border-white/10 mt-2 pb-8">
            <button onClick={() => handleApprove(selectedReq)} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl transition-colors flex justify-center items-center gap-2 text-base">
              <Check className="w-5 h-5"/> Approve
            </button>
            <button onClick={() => handleReject(selectedReq)} className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-4 rounded-xl transition-colors flex justify-center items-center gap-2 border border-red-500/20 text-base">
              <X className="w-5 h-5"/> Reject
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{itemTypeLabel} Approvals</h1>
      </div>
      
      {loading ? (
        <div className="text-zinc-500">Loading requests...</div>
      ) : (
        <div className="bg-[#111] rounded-2xl border border-white/10 overflow-hidden">
           {requests.length === 0 ? (
             <div className="p-8 text-center text-zinc-500">
                No items pending for approval.
             </div>
           ) : (
             <div className="flex flex-col">
               {requests.map((req, idx) => {
                 const data = req.data || {};
                 const name = isProduct ? data.productName : data.name;
                 const logoUrl = data.logo || (isProduct ? data.productImage : null);

                 return (
                   <div 
                     key={req.id} 
                     onClick={() => setSelectedReq(req)}
                     className={cn(
                       "flex items-center gap-4 p-4 hover:bg-white/5 cursor-pointer transition-colors", 
                       idx !== requests.length - 1 && "border-b border-white/10"
                     )}
                   >
                     {/* Left: Icon */}
                     <div className="w-12 h-12 rounded-xl bg-black border border-white/10 shrink-0 overflow-hidden">
                       {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-500"><User className="w-5 h-5"/></div>}
                     </div>
                     
                     {/* Next: Creator Name & Mode */}
                     <div className="w-1/4 shrink-0 truncate">
                        <p className="font-medium text-white truncate">{req.creatorName}</p>
                        <p className={cn("text-xs uppercase font-bold mt-0.5 w-fit px-2 py-0.5 rounded-full", req.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : req.status === 'approved' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500')}>
                          {req.status}
                        </p>
                     </div>

                     {/* Middle: App Name */}
                     <div className="flex-1 font-bold text-lg text-white truncate">
                        {name || 'Unnamed'}
                     </div>

                     {/* Right: Date */}
                     <div className="shrink-0 text-right">
                        <p className="text-zinc-500 font-medium">{req.createdAt?.toDate().toLocaleDateString()}</p>
                     </div>
                   </div>
                 );
               })}
             </div>
           )}
        </div>
      )}
    </div>
  );
}

