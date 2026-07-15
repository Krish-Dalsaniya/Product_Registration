import React, { useState, useRef } from 'react';
import { Upload, X, File, FileText, Image as ImageIcon, Film, FileArchive, Loader2 } from 'lucide-react';
import axios from 'axios';

const getFileIcon = (type) => {
  if (type.includes('image')) return <ImageIcon size={20} className="text-blue-500" />;
  if (type.includes('video')) return <Film size={20} className="text-purple-500" />;
  if (type.includes('pdf')) return <FileText size={20} className="text-red-500" />;
  if (type.includes('zip') || type.includes('rar')) return <FileArchive size={20} className="text-amber-500" />;
  return <File size={20} className="text-gray-500" />;
};

export const FileUploadField = ({ q, value, onChange, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  // value is expected to be a JSON string of array of file objects, or an array of objects
  let files = [];
  try {
    files = typeof value === 'string' && value ? JSON.parse(value) : (value || []);
    if (!Array.isArray(files)) files = [];
  } catch (e) {
    files = [];
  }

  const maxFiles = q.config?.max_files || 1;
  const maxSizeBytes = (q.config?.max_file_size_kb || 10240) * 1024;
  const allowedExtensions = q.config?.allowed_extensions || [];

  const handleUpload = async (uploadFiles) => {
    if (disabled || uploadFiles.length === 0) return;
    
    const validFiles = Array.from(uploadFiles).filter(file => {
      if (file.size > maxSizeBytes) {
        alert(`File ${file.name} exceeds max size of ${maxSizeBytes / 1024 / 1024}MB`);
        return false;
      }
      if (allowedExtensions.length > 0) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (!allowedExtensions.includes(ext)) {
          alert(`File ${file.name} type not allowed. Allowed: ${allowedExtensions.join(', ')}`);
          return false;
        }
      }
      return true;
    });

    if (validFiles.length === 0) return;

    if (files.length + validFiles.length > maxFiles) {
      alert(`You can only upload up to ${maxFiles} file(s)`);
      return;
    }

    setIsUploading(true);
    setProgress(10);

    const newFiles = [...files];

    for (const file of validFiles) {
      try {
        // Simulate Cloudinary upload (Replace with actual Cloudinary endpoint later)
        // const formData = new FormData();
        // formData.append('file', file);
        // formData.append('upload_preset', 'your_preset');
        // const res = await axios.post('https://api.cloudinary.com/v1_1/your_cloud/upload', formData, {
        //   onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / e.total))
        // });
        
        // Mock success
        await new Promise(r => setTimeout(r, 1000));
        setProgress(100);

        newFiles.push({
          url: URL.createObjectURL(file), // Mock URL
          original_name: file.name,
          file_size: file.size,
          mime_type: file.type
        });

      } catch (error) {
        console.error('Upload failed', error);
        alert(`Upload failed for ${file.name}`);
      }
    }

    setIsUploading(false);
    setProgress(0);
    onChange(JSON.stringify(newFiles));
  };

  const removeFile = (index) => {
    const updated = [...files];
    updated.splice(index, 1);
    onChange(JSON.stringify(updated));
  };

  return (
    <div className="w-full md:w-2/3 space-y-4">
      {files.length < maxFiles && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleUpload(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors ${disabled ? 'cursor-not-allowed opacity-60 bg-gray-50' : 'cursor-pointer'} ${isDragging ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5'}`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin mb-2" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Uploading... {progress}%</span>
            </div>
          ) : (
            <>
              <Upload size={32} className="text-gray-400 mb-3" />
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Click to upload or drag & drop</span>
              <span className="text-xs text-gray-500 mt-1">
                Max {maxFiles} file(s) • {(maxSizeBytes / 1024 / 1024).toFixed(1)}MB limit
                {allowedExtensions.length > 0 && ` • ${allowedExtensions.join(', ').toUpperCase()}`}
              </span>
            </>
          )}
          <input 
            type="file" 
            className="hidden" 
            ref={fileInputRef} 
            disabled={disabled || isUploading}
            multiple={maxFiles > 1}
            onChange={(e) => handleUpload(e.target.files)} 
          />
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-none">
                  {getFileIcon(f.mime_type)}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{f.original_name}</span>
                  <span className="text-xs text-gray-500">{(f.file_size / 1024).toFixed(1)} KB</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-[var(--accent)] transition-colors">
                  <span className="text-xs font-semibold">View</span>
                </a>
                {!disabled && (
                  <button type="button" onClick={() => removeFile(i)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
