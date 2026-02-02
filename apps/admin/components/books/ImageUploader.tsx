'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { cn, isValidImageFile, formatFileSize } from '../../lib/utils';
import { Spinner } from '../ui/Loading';
import { Upload, X, Image as ImageIcon, AlertCircle, Camera, Download } from 'lucide-react';
import { Id } from '@convex/_generated/dataModel';

interface ImageUploaderProps {
  currentImageId?: Id<"_storage">;
  currentImageUrl?: string;
  legacyAssetKey?: string;
  onUpload: (storageId: Id<"_storage">) => void;
  onRemove?: () => void;
  label?: string;
  className?: string;
  downloadFilename?: string; // Optional filename for download
}

export function ImageUploader({
  currentImageId,
  currentImageUrl,
  legacyAssetKey,
  onUpload,
  onRemove,
  label = 'Upload Image',
  className,
  downloadFilename = 'image',
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.books.generateUploadUrl);

  const processFile = async (file: File) => {
    // Validate file
    const validation = isValidImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setError(null);
    setIsUploading(true);

    // Create preview
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);

    try {
      // Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();

      // Upload file
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const { storageId } = await response.json();
      onUpload(storageId);
    } catch (err) {
      setError('Failed to upload image. Please try again.');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) processFile(file);
  }, [generateUploadUrl, onUpload]);

  // Handle camera/gallery input change
  const handleCameraInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // Download image
  const handleDownload = async () => {
    const url = previewUrl || currentImageUrl;
    if (!url) return;

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${downloadFilename}.${blob.type.split('/')[1] || 'png'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  const hasImage = currentImageId || currentImageUrl || legacyAssetKey || previewUrl;
  const displayUrl = previewUrl || currentImageUrl;

  return (
    <div className={className}>
      {label && (
        <label className="input-label">{label}</label>
      )}

      {/* Hidden camera input for mobile */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraInput}
        className="hidden"
      />

      {hasImage ? (
        <div className="relative group">
          <div className="aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden border-2 border-gray-200">
            {displayUrl ? (
              <img
                src={displayUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            ) : (legacyAssetKey && !imageLoadError) ? (
              <img
                src={`/legacy-covers/${legacyAssetKey}.png`}
                alt="Legacy Cover"
                className="w-full h-full object-cover"
                onError={() => setImageLoadError(true)}
              />
            ) : legacyAssetKey ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <ImageIcon size={48} />
                <p className="text-sm mt-2">Legacy Image</p>
                <p className="text-xs text-gray-500">{legacyAssetKey}</p>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Spinner />
              </div>
            )}
          </div>

          {/* Action buttons - always visible on mobile, hover on desktop */}
          <div className="absolute inset-0 bg-black/50 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3">
            {/* Upload from files */}
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              <button
                type="button"
                className="p-3 bg-white rounded-lg text-gray-700 hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Upload from files"
              >
                <Upload size={20} />
              </button>
            </div>

            {/* Camera/Gallery (mobile) */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="p-3 bg-white rounded-lg text-gray-700 hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center md:hidden"
              title="Take photo or choose from gallery"
            >
              <Camera size={20} />
            </button>

            {/* Download */}
            {displayUrl && (
              <button
                type="button"
                onClick={handleDownload}
                className="p-3 bg-white rounded-lg text-primary-600 hover:bg-primary-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Download image"
              >
                <Download size={20} />
              </button>
            )}

            {/* Remove */}
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="p-3 bg-white rounded-lg text-error-600 hover:bg-error-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Remove image"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {isUploading && (
            <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
              <Spinner size="lg" />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Drop zone */}
          <div
            {...getRootProps()}
            className={cn(
              'aspect-[4/3] border-2 border-dashed rounded-xl transition-colors cursor-pointer',
              'flex flex-col items-center justify-center gap-3',
              // Touch-friendly padding
              'min-h-[200px] md:min-h-0',
              isDragActive
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50',
              isUploading && 'pointer-events-none opacity-50'
            )}
          >
            <input {...getInputProps()} />
            {isUploading ? (
              <Spinner size="lg" />
            ) : (
              <>
                <div className="p-3 bg-gray-100 rounded-full">
                  <Upload size={24} className="text-gray-400" />
                </div>
                <div className="text-center px-4">
                  <p className="text-sm font-medium text-gray-700">
                    {isDragActive ? 'Drop image here' : 'Tap to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG or WebP (max 15MB)
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Camera button for mobile (when no image) */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="w-full py-3 px-4 bg-primary-50 text-primary-700 rounded-lg flex items-center justify-center gap-2 font-medium md:hidden min-h-[44px]"
          >
            <Camera size={20} />
            Take Photo or Choose from Gallery
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 mt-2 text-sm text-error-600">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
