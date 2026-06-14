import React, { useState } from 'react';
import { optimizeAndUploadImage, UploadProgress } from '../../lib/upload';
import { Loader2, CheckCircle2, AlertCircle, UploadCloud } from 'lucide-react';

interface FileUploadProps {
  label?: string;
  path: string;
  multiple?: boolean;
  onUploadComplete: (urls: string | string[]) => void;
  disabled?: boolean;
}

export default function FileUpload({ label, path, multiple, onUploadComplete, disabled }: FileUploadProps) {
  const [uploads, setUploads] = useState<Record<string, UploadProgress>>({});

  const formatSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files) as File[];
    
    const newUploads = { ...(!multiple ? {} : uploads) };
    const urls: string[] = [];
    
    // Batch UI initialization
    files.forEach(file => {
      newUploads[file.name] = { progress: 0, status: 'compressing', originalSize: file.size };
    });
    setUploads({ ...newUploads });

    // Process files
    for (const file of files) {
      try {
        const url = await optimizeAndUploadImage(file, path, (prog) => {
          setUploads(prev => ({
            ...prev,
            [file.name]: prog
          }));
        });
        urls.push(url);
      } catch (err: any) {
        console.error("Upload Error:", err);
        setUploads(prev => ({
          ...prev,
          [file.name]: { progress: 0, status: 'error', error: err.message || 'Upload failed' }
        }));
      }
    }

    if (urls.length > 0) {
      onUploadComplete(multiple ? urls : urls[0]);
    }
    
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {label && <label className="text-sm font-medium text-zinc-300">{label}</label>}
      <div className="relative">
        <input 
          type="file" 
          accept="image/*" 
          multiple={multiple} 
          onChange={handleFileChange} 
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
        />
        <div className="flex items-center justify-center p-4 border border-dashed border-white/20 rounded-xl bg-[#111] hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2 text-zinc-400">
             <UploadCloud className="w-5 h-5" />
             <span className="text-sm font-medium text-center">{multiple ? 'Click or drag images here to upload & compress' : 'Click or drag an image here to upload & compress'}</span>
          </div>
        </div>
      </div>

      {Object.entries(uploads).length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          {Object.entries(uploads).map(([fileName, state]: [string, any]) => (
            <div key={fileName} className="bg-[#151515] p-3 rounded-xl border border-white/10 flex flex-col gap-2">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm gap-2">
                 <div className="flex items-center gap-2 max-w-full">
                    {state.status === 'compressing' && <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />}
                    {state.status === 'uploading' && <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />}
                    {state.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                    {state.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                    
                    <span className="text-zinc-300 font-medium capitalize flex-shrink-0">
                       {state.status === 'compressing' ? 'Optimizing' : state.status}
                    </span>
                    <span className="truncate text-zinc-500 text-xs hidden sm:inline-block max-w-[150px] ml-2">{fileName}</span>
                 </div>
                 
                 <div className="text-xs text-zinc-500 flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                    <span className="truncate text-zinc-500 sm:hidden block max-w-[100px]">{fileName}</span>
                    <div className="flex gap-3 text-right">
                      {state.originalSize && <span>Before: {formatSize(state.originalSize)}</span>}
                      {state.optimizedSize && <span className="text-emerald-400 font-medium">After: {formatSize(state.optimizedSize)}</span>}
                    </div>
                 </div>
               </div>
               
               {(state.status === 'uploading' || state.status === 'success') && (
                 <div className="relative w-full bg-black rounded-full h-2 border border-white/5 overflow-hidden">
                   <div 
                     className={`h-full ${state.status === 'success' ? 'bg-green-500' : 'bg-primary'} transition-all duration-300 ease-out`}
                     style={{ width: `${Math.round(state.progress)}%` }}
                   />
                 </div>
               )}
               <div className="flex justify-end text-[10px] text-zinc-500">
                 {state.status === 'uploading' && (
                   <span className="font-mono">{state.progress.toFixed(1)}%</span>
                 )}
               </div>
               {state.error && <p className="text-xs text-red-400 mt-1 bg-red-500/10 p-2 rounded-lg border border-red-500/20">{state.error}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
