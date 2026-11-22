import React, { useState, useRef } from 'react';
import { UploadCloud, X, Loader2, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { uploadProductImage } from '../lib/r2-upload';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  helperText?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  label = 'Product Image',
  helperText = 'Upload high quality JPG, PNG, or WebP (max 5MB)',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setErrorMessage(null);
    setIsUploading(true);
    setUploadProgress(10);

    try {
      const publicUrl = await uploadProductImage(file, (percent) => {
        setUploadProgress(percent);
      });
      onChange(publicUrl);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Image upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-700">{label}</label>

      {value ? (
        <div className="relative group rounded-xl border border-slate-200 bg-slate-50 p-3 max-w-sm">
          <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-white border border-slate-100 flex items-center justify-center">
            <img
              src={value}
              alt="Preview"
              className="h-full w-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';
              }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Image attached
            </span>
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-red-500 hover:text-red-700 flex items-center gap-1 font-medium transition"
            >
              <X className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition max-w-md ${
            isDragOver
              ? 'border-emerald-500 bg-emerald-50/50'
              : 'border-slate-300 hover:border-emerald-400 bg-white hover:bg-slate-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onFileChange}
            disabled={isUploading}
          />

          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              {isUploading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <UploadCloud className="w-6 h-6" />
              )}
            </div>

            <div className="text-sm font-semibold text-slate-700">
              {isUploading ? 'Uploading to Cloudflare R2...' : 'Click to upload or drag & drop'}
            </div>
            <p className="text-xs text-slate-500">{helperText}</p>

            {isUploading && (
              <div className="w-full max-w-xs mt-3 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Direct URL input option */}
      <div className="flex items-center gap-2 max-w-md mt-2">
        <span className="text-xs text-slate-400 font-medium">or paste image URL:</span>
        <input
          type="url"
          placeholder="https://..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
        />
      </div>

      {errorMessage && (
        <p className="text-xs text-red-600 font-medium mt-1">{errorMessage}</p>
      )}
    </div>
  );
};
