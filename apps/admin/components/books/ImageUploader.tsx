'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { cn, isValidImageFile, formatFileSize } from '../../lib/utils';
import { Spinner } from '../ui/Loading';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Id } from '@convex/_generated/dataModel';

interface ImageUploaderProps {
  currentImageId?: Id<"_storage">;
  currentImageUrl?: string;
  legacyAssetKey?: string;
  onUpload: (storageId: Id<"_storage">) => void;
  onRemove?: () => void;
  label?: string;
  className?: string;
}

export function ImageUploader({
  currentImageId,
  currentImageUrl,
  legacyAssetKey,
  onUpload,
  onRemove,
  label = 'Upload Image',
  className,
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);

  const generateUploadUrl = useMutation(api.books.generateUploadUrl);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

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
  }, [generateUploadUrl, onUpload]);

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

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-4">
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              <button
                type="button"
                className="p-2 bg-white rounded-lg text-gray-700 hover:bg-gray-100"
                title="Replace image"
              >
                <Upload size={20} />
              </button>
            </div>
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="p-2 bg-white rounded-lg text-error-600 hover:bg-error-50"
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
        <div
          {...getRootProps()}
          className={cn(
            'aspect-[4/3] border-2 border-dashed rounded-xl transition-colors cursor-pointer',
            'flex flex-col items-center justify-center gap-3',
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
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  {isDragActive ? 'Drop image here' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PNG, JPG or WebP (max 15MB)
                </p>
              </div>
            </>
          )}
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
