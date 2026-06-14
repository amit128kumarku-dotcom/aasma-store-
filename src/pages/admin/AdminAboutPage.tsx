import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, addDoc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import FileUpload from '../../components/admin/FileUpload';

interface AboutSection {
  id?: string;
  title: string;
  content: string;
  image: string;
  link1: string;
  buttonName: string;
  link2: string;
  order: number;
}

export default function AdminAboutPage() {
  const [sections, setSections] = useState<AboutSection[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<AboutSection>({
    title: '',
    content: '',
    image: '',
    link1: '',
    buttonName: '',
    link2: '',
    order: 0
  });

  const [loading, setLoading] = useState(true);

  const [previewData, setPreviewData] = useState<AboutSection | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'about_sections'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setSections(snap.docs.map(d => ({ id: d.id, ...d.data() } as AboutSection)));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching about_sections:", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleOpenEdit = (item?: AboutSection) => {
    setPreviewData(null); // close preview
    if (item) {
      setEditingId(item.id!);
      setFormData(item);
    } else {
      setEditingId(null);
      setFormData({
        title: '',
        content: '',
        image: '',
        link1: '',
        buttonName: '',
        link2: '',
        order: sections.length + 1
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'about_sections', editingId), { ...formData });
      } else {
        await addDoc(collection(db, 'about_sections'), { ...formData });
      }
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this?')) {
      try {
        await deleteDoc(doc(db, 'about_sections', id));
        setPreviewData(null);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">About Us Page Content</h1>
          <p className="text-zinc-500 text-sm">Manage the sections displayed on the About page.</p>
        </div>
        <button 
          onClick={() => handleOpenEdit()}
          className="bg-primary hover:bg-primary/90 text-white p-3 rounded-xl transition-all shadow-lg flex items-center justify-center"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {loading ? (
         <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
         </div>
      ) : (
         <div className="flex flex-col gap-3">
            {sections.map(sec => (
               <div 
                  key={sec.id} 
                  onClick={() => setPreviewData(sec)}
                  className="bg-[#111] border border-white/10 p-5 rounded-2xl cursor-pointer hover:bg-[#151515] hover:border-white/20 transition-all flex items-center justify-between"
               >
                  <div className="font-bold text-white text-lg">{sec.title || 'Untitled Section'}</div>
                  <div className="text-sm font-medium text-zinc-500">Order: {sec.order}</div>
               </div>
            ))}
            {sections.length === 0 && (
               <div className="py-16 text-center bg-[#111] rounded-2xl border border-white/10">
                  <AlertCircle className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400 font-medium">No about sections added yet.</p>
                  <p className="text-zinc-500 text-sm mt-1">Click the + button to create the first section.</p>
               </div>
            )}
         </div>
      )}

      {/* Preview Modal */}
      {previewData && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-xl my-8 p-6 flex flex-col gap-6 relative">
             <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <h2 className="text-xl font-bold text-white">Preview Section</h2>
                <div className="flex items-center gap-2">
                   <button onClick={() => handleDelete(previewData.id!)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-white/5 rounded-lg transition-colors">
                      <Trash2 className="w-5 h-5" />
                   </button>
                   <button onClick={() => handleOpenEdit(previewData)} className="p-2 text-zinc-400 hover:text-primary hover:bg-white/5 rounded-lg transition-colors">
                      <Edit2 className="w-5 h-5" />
                   </button>
                   <button onClick={() => setPreviewData(null)} className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors ml-2">
                      <X className="w-6 h-6" />
                   </button>
                </div>
             </div>

             <div className="flex flex-col gap-4 text-white">
                <div><span className="text-zinc-500 font-bold uppercase text-xs">Title:</span><br/>{previewData.title || '-'}</div>
                {previewData.image && (
                   <div>
                      <span className="text-zinc-500 font-bold uppercase text-xs">Image:</span><br/>
                      <img src={previewData.image} alt="Preview" className="w-full max-h-64 object-cover rounded-xl mt-1 border border-white/10" />
                   </div>
                )}
                <div><span className="text-zinc-500 font-bold uppercase text-xs">Content:</span><br/><p className="whitespace-pre-wrap">{previewData.content || '-'}</p></div>
                <div><span className="text-zinc-500 font-bold uppercase text-xs">Primary Link:</span><br/>{previewData.link1 || '-'}</div>
                <div><span className="text-zinc-500 font-bold uppercase text-xs">Button Name:</span><br/>{previewData.buttonName || '-'}</div>
                <div><span className="text-zinc-500 font-bold uppercase text-xs">Secondary Link:</span><br/>{previewData.link2 || '-'}</div>
                <div><span className="text-zinc-500 font-bold uppercase text-xs">Order:</span><br/>{previewData.order}</div>
             </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-xl my-8 animate-in zoom-in-95">
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">{editingId ? 'Edit Section' : 'Create Section'}</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Title / Heading</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData(f => ({...f, title: e.target.value}))}
                  className="bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="e.g. Contact Our Team"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Content Summary</label>
                <textarea
                  value={formData.content}
                  onChange={e => setFormData(f => ({...f, content: e.target.value}))}
                  className="bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary min-h-[100px] resize-y"
                  placeholder="Type any details here..."
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Image / Banner</label>
                <FileUpload 
                  path="about" 
                  onUploadComplete={url => setFormData(f => ({...f, image: Array.isArray(url) ? url[0] : url}))} 
                />
                {formData.image && (
                  <div className="mt-2 relative inline-block">
                    <img src={formData.image} alt="Preview" className="h-24 rounded-lg border border-white/10" />
                    <button type="button" onClick={() => setFormData(f => ({...f, image: ''}))} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white hover:bg-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="flex flex-col gap-2">
                   <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Primary Link</label>
                   <input
                     type="url"
                     value={formData.link1}
                     onChange={e => setFormData(f => ({...f, link1: e.target.value}))}
                     className="bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                     placeholder="https://"
                   />
                 </div>

                 <div className="flex flex-col gap-2">
                   <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Button Name</label>
                   <input
                     type="text"
                     value={formData.buttonName}
                     onChange={e => setFormData(f => ({...f, buttonName: e.target.value}))}
                     className="bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                     placeholder="e.g. Join Now"
                   />
                 </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Secondary Link (Optional)</label>
                <input
                  type="url"
                  value={formData.link2}
                  onChange={e => setFormData(f => ({...f, link2: e.target.value}))}
                  className="bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="https://"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Sort Order (Sequence)</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={e => setFormData(f => ({...f, order: parseInt(e.target.value) || 0}))}
                  className="bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <p className="text-[10px] text-zinc-500">Lower numbers appear first (1, 2, 3...)</p>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-3 mt-2">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold transition-colors"
                >
                  Save Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
