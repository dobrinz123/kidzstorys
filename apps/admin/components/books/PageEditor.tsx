'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { ImageUploader } from './ImageUploader';
import { LanguageTabs } from '../ui/Tabs';
import { Textarea } from '../ui/Input';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { Trash2, GripVertical, ChevronUp, ChevronDown, AlertCircle, CheckCircle, Play, Pause, Volume2, X } from 'lucide-react';
import { BookPage, Language } from '../../types';
import { Id } from '@convex/_generated/dataModel';

interface PageEditorProps {
  page: BookPage;
  pageIndex: number;
  totalPages: number;
  bookId?: Id<"books">;
  onChange: (page: BookPage) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  imageUrl?: string;
}

export function PageEditor({
  page,
  pageIndex,
  totalPages,
  bookId,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  imageUrl,
}: PageEditorProps) {
  const [activeLanguage, setActiveLanguage] = useState<Language>('en');
  const [isExpanded, setIsExpanded] = useState(true);
  const [playingLocale, setPlayingLocale] = useState<string | null>(null);
  const [deletingLocale, setDeletingLocale] = useState<string | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const deletePageAudio = useMutation(api.audio.deletePageAudio);

  // Fetch image URL if not provided prop but ID exists
  const fetchedImageUrl = useQuery(api.books.getFileUrl, page.imageId ? { storageId: page.imageId } : "skip");
  const displayImageUrl = imageUrl || (fetchedImageUrl as string | undefined);

  const handleImageUpload = (storageId: Id<"_storage">) => {
    onChange({
      ...page,
      imageId: storageId,
      legacyAssetKey: undefined,
    });
  };

  const handleTextChange = (lang: Language, text: string) => {
    onChange({
      ...page,
      [`text_${lang}`]: text,
    });
  };

  // Check if page is complete
  const isComplete =
    (page.imageId || page.legacyAssetKey) &&
    page.text_en.trim() !== '' &&
    page.text_ro.trim() !== '' &&
    page.text_it.trim() !== '';

  const getMissingItems = () => {
    const missing: string[] = [];
    if (!page.imageId && !page.legacyAssetKey) missing.push('Image');
    if (!page.text_en.trim()) missing.push('English text');
    if (!page.text_ro.trim()) missing.push('Romanian text');
    if (!page.text_it.trim()) missing.push('Italian text');
    return missing;
  };

  return (
    <div className="card p-0 overflow-hidden">
      {/* Header */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 border-b cursor-pointer',
          isComplete ? 'bg-success-50 border-success-200' : 'bg-gray-50 border-gray-200'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <GripVertical size={18} className="text-gray-400 cursor-grab" />

        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle size={18} className="text-success-500" />
          ) : (
            <AlertCircle size={18} className="text-warning-500" />
          )}
          <span className="font-medium">Page {pageIndex + 1}</span>
        </div>

        {!isComplete && (
          <span className="text-xs text-warning-600 bg-warning-100 px-2 py-0.5 rounded">
            Missing: {getMissingItems().join(', ')}
          </span>
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            onClick={onMoveUp}
            disabled={pageIndex === 0}
            title="Move up"
          >
            <ChevronUp size={18} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onMoveDown}
            disabled={pageIndex === totalPages - 1}
            title="Move down"
          >
            <ChevronDown size={18} />
          </Button>
          <Button
            variant="ghost"
            onClick={onDelete}
            className="text-error-600 hover:text-error-700 hover:bg-error-50 gap-2"
            title="Delete page"
          >
            <Trash2 size={18} />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>

        {isExpanded ? (
          <ChevronUp size={18} className="text-gray-400" />
        ) : (
          <ChevronDown size={18} className="text-gray-400" />
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image */}
            <ImageUploader
              currentImageId={page.imageId}
              currentImageUrl={displayImageUrl}
              legacyAssetKey={page.legacyAssetKey}
              onUpload={handleImageUpload}
              label="Page Image"
            />

            {/* Text */}
            <div>
              <LanguageTabs
                activeLanguage={activeLanguage}
                onChange={setActiveLanguage}
                className="mb-4"
              />

              {activeLanguage === 'en' && (
                <Textarea
                  value={page.text_en}
                  onChange={(e) => handleTextChange('en', e.target.value)}
                  placeholder="Enter English text..."
                  rows={8}
                  className="min-h-[200px]"
                />
              )}
              {activeLanguage === 'ro' && (
                <Textarea
                  value={page.text_ro}
                  onChange={(e) => handleTextChange('ro', e.target.value)}
                  placeholder="Introduceți textul în română..."
                  rows={8}
                  className="min-h-[200px]"
                />
              )}
              {activeLanguage === 'it' && (
                <Textarea
                  value={page.text_it}
                  onChange={(e) => handleTextChange('it', e.target.value)}
                  placeholder="Inserisci il testo in italiano..."
                  rows={8}
                  className="min-h-[200px]"
                />
              )}

              <p className="text-xs text-gray-500 mt-2">
                {activeLanguage === 'en' && `${page.text_en.length} characters`}
                {activeLanguage === 'ro' && `${page.text_ro.length} characters`}
                {activeLanguage === 'it' && `${page.text_it.length} characters`}
              </p>
            </div>
          </div>

          {/* Audio Preview Section */}
          {((page as any).audioUrl_en || (page as any).audioUrl_ro) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Volume2 size={16} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Audio</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {(['en', 'ro'] as const).map((locale) => {
                  const audioUrl = (page as any)[`audioUrl_${locale}`] as string | undefined;
                  const audioStatus = (page as any)[`audioStatus_${locale}`] as string | undefined;
                  if (!audioUrl || audioStatus !== 'done') return null;
                  const isPlaying = playingLocale === locale;
                  const isDeleting = deletingLocale === locale;
                  return (
                    <div key={locale} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase w-6">{locale}</span>
                      <Button
                        variant={isPlaying ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => {
                          if (isPlaying && audioElRef.current) {
                            audioElRef.current.pause();
                            setPlayingLocale(null);
                            return;
                          }
                          if (audioElRef.current) audioElRef.current.pause();
                          const audio = new Audio(audioUrl);
                          audio.onended = () => setPlayingLocale(null);
                          audio.play();
                          audioElRef.current = audio;
                          setPlayingLocale(locale);
                        }}
                        title={isPlaying ? 'Pause' : `Play ${locale.toUpperCase()} audio`}
                      >
                        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                      </Button>
                      {bookId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-error-500 hover:text-error-700 hover:bg-error-50"
                          isLoading={isDeleting}
                          onClick={async () => {
                            if (!confirm(`Delete ${locale.toUpperCase()} audio for page ${pageIndex + 1}?`)) return;
                            setDeletingLocale(locale);
                            if (isPlaying && audioElRef.current) {
                              audioElRef.current.pause();
                              setPlayingLocale(null);
                            }
                            try {
                              await deletePageAudio({ bookId, pageIndex, locale });
                            } catch (err) {
                              alert(err instanceof Error ? err.message : 'Failed to delete audio');
                            } finally {
                              setDeletingLocale(null);
                            }
                          }}
                          title={`Delete ${locale.toUpperCase()} audio`}
                        >
                          <X size={14} />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
