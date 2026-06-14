import { storage } from './firebase';

export interface UploadProgress {
  progress: number;
  status: 'compressing' | 'uploading' | 'success' | 'error';
  originalSize?: number;
  optimizedSize?: number;
  error?: string;
  url?: string;
}

export async function optimizeAndUploadImage(
  file: File, 
  path: string, 
  onProgress?: (progress: UploadProgress) => void,
  maxWidth = 800 // Reduced maxWidth to make base64 smaller
): Promise<string> {
  return new Promise((resolve, reject) => {
    onProgress?.({ progress: 0, status: 'compressing', originalSize: file.size });
    
    // Convert to webp with 0.6 quality for optimal size
    const quality = 0.6;
    
    const timeout = setTimeout(() => {
       const err = 'Image processing timeout';
       onProgress?.({ progress: 0, status: 'error', error: err });
       reject(new Error(err));
    }, 60000); 

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          clearTimeout(timeout);
          return reject(new Error('No canvas context'));
        }
        
        ctx.drawImage(img, 0, 0, width, height);

        // Convert directly to base64 Data URL to store in Firestore
        // This avoids Firebase Storage entirely.
        const dataUrl = canvas.toDataURL('image/webp', quality);
        
        clearTimeout(timeout);
        // Estimate size in bytes
        const optimizedSize = Math.round((dataUrl.length * 3) / 4);
        
        console.log(`[Compression Success] Original: ${(file.size/1024).toFixed(2)}KB | Base64: ${(optimizedSize/1024).toFixed(2)}KB`);
        
        // Simulate a small upload delay for the UI progress bar as requested by user
        onProgress?.({ progress: 50, status: 'uploading', originalSize: file.size, optimizedSize });
        
        setTimeout(() => {
          onProgress?.({ progress: 100, status: 'success', originalSize: file.size, optimizedSize, url: dataUrl });
          resolve(dataUrl);
        }, 300);
      };
      img.onerror = (e) => {
        clearTimeout(timeout);
        onProgress?.({ progress: 0, status: 'error', error: 'Image load failed' });
        reject(e);
      };
    };
    reader.onerror = (e) => {
       clearTimeout(timeout);
       onProgress?.({ progress: 0, status: 'error', error: 'File read failed' });
       reject(e);
    };
  });
}
