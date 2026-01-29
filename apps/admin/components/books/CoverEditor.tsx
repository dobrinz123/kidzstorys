'use client';

import { useState } from 'react';
import { ImageUploader } from './ImageUploader';
import { LanguageTabs } from '../ui/Tabs';
import { Input } from '../ui/Input';
import { Card, CardTitle } from '../ui/Card';
import { cn } from '../../lib/utils';
import { AlertCircle, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { BookCover, Language } from '../../types';
import { Id } from '@convex/_generated/dataModel';

interface CoverEditorProps {
  cover: BookCover;
  onChange: (cover: BookCover) => void;
  imageUrl?: string;
}

export function CoverEditor({ cover, onChange, imageUrl }: CoverEditorProps) {
  const [activeLanguage, setActiveLanguage] = useState<Language>('en');

  const handleImageUpload = (storageId: Id<"_storage">) => {
    onChange({
      ...cover,
      imageId: storageId,
      legacyAssetKey: undefined,
    });
  };

  const handleTitleChange = (lang: Language, title: string) => {
    onChange({
      ...cover,
      [`title_${lang}`]: title,
    });
  };

  // Check if cover is complete
  const isComplete =
    (cover.imageId || cover.legacyAssetKey) &&
    cover.title_en.trim() !== '' &&
    cover.title_ro.trim() !== '' &&
    cover.title_it.trim() !== '';

  const getMissingItems = () => {
    const missing: string[] = [];
    if (!cover.imageId && !cover.legacyAssetKey) missing.push('Image');
    if (!cover.title_en.trim()) missing.push('English title');
    if (!cover.title_ro.trim()) missing.push('Romanian title');
    if (!cover.title_it.trim()) missing.push('Italian title');
    return missing;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        {isComplete ? (
          <CheckCircle size={20} className="text-success-500" />
        ) : (
          <AlertCircle size={20} className="text-warning-500" />
        )}
        <CardTitle>Book Cover</CardTitle>
        {!isComplete && (
          <span className="text-xs text-warning-600 bg-warning-100 px-2 py-0.5 rounded ml-2">
            Missing: {getMissingItems().join(', ')}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cover Image */}
        <ImageUploader
          currentImageId={cover.imageId}
          currentImageUrl={imageUrl}
          legacyAssetKey={cover.legacyAssetKey}
          onUpload={handleImageUpload}
          label="Cover Image"
        />

        {/* Titles */}
        <div>
          <LanguageTabs
            activeLanguage={activeLanguage}
            onChange={setActiveLanguage}
            className="mb-4"
          />

          {activeLanguage === 'en' && (
            <Input
              label="English Title"
              value={cover.title_en}
              onChange={(e) => handleTitleChange('en', e.target.value)}
              placeholder="Enter book title in English..."
              maxLength={100}
            />
          )}
          {activeLanguage === 'ro' && (
            <Input
              label="Romanian Title"
              value={cover.title_ro}
              onChange={(e) => handleTitleChange('ro', e.target.value)}
              placeholder="Introduceți titlul cărții în română..."
              maxLength={100}
            />
          )}
          {activeLanguage === 'it' && (
            <Input
              label="Italian Title"
              value={cover.title_it}
              onChange={(e) => handleTitleChange('it', e.target.value)}
              placeholder="Inserisci il titolo del libro in italiano..."
              maxLength={100}
            />
          )}

          {/* Preview */}
          <div className="mt-6">
            <p className="input-label">All Titles Preview</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg">🇬🇧</span>
                <span className={cover.title_en ? 'text-gray-900' : 'text-gray-400 italic'}>
                  {cover.title_en || 'No English title'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🇷🇴</span>
                <span className={cover.title_ro ? 'text-gray-900' : 'text-gray-400 italic'}>
                  {cover.title_ro || 'No Romanian title'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🇮🇹</span>
                <span className={cover.title_it ? 'text-gray-900' : 'text-gray-400 italic'}>
                  {cover.title_it || 'No Italian title'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
