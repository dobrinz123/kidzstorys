import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BookPage, BookCover, ValidationError, Language } from '../types';
import { VALIDATION_MESSAGES } from './constants';

// Combine class names with Tailwind merge
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date
export function formatDate(timestamp: number, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  return new Date(timestamp).toLocaleDateString('en-US', options || defaultOptions);
}

// Format date with time
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Format relative time
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
  if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

// Format number with K/M suffix
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

// Format percentage
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// Generate slug from title
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

// Check if book cover is complete
export function isCoverComplete(cover: BookCover): boolean {
  const hasTitles = cover.title_en.trim() !== '' &&
    cover.title_ro.trim() !== '' &&
    cover.title_it.trim() !== '';
  const hasImage = cover.imageId !== undefined || cover.legacyAssetKey !== undefined;
  return hasTitles && hasImage;
}

// Check if book page is complete
export function isPageComplete(page: BookPage): boolean {
  const hasText = page.text_en.trim() !== '' &&
    page.text_ro.trim() !== '' &&
    page.text_it.trim() !== '';
  const hasImage = page.imageId !== undefined || page.legacyAssetKey !== undefined;
  return hasText && hasImage;
}

// Validate book for publishing
export function validateBookForPublishing(book: {
  cover: BookCover;
  pages: BookPage[];
  categoryId: string;
  ageMin: number;
  ageMax: number;
  durationMin: number;
}): { isValid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  // Validate cover
  if (!book.cover.title_en.trim()) {
    errors.push({ field: 'cover.title_en', message: 'English title is required' });
  }
  if (!book.cover.title_ro.trim()) {
    errors.push({ field: 'cover.title_ro', message: 'Romanian title is required' });
  }
  if (!book.cover.title_it.trim()) {
    errors.push({ field: 'cover.title_it', message: 'Italian title is required' });
  }
  if (!book.cover.imageId && !book.cover.legacyAssetKey) {
    errors.push({ field: 'cover.image', message: 'Cover image is required' });
  }

  // Validate pages
  if (book.pages.length === 0) {
    errors.push({ field: 'pages', message: VALIDATION_MESSAGES.minPages });
  }

  book.pages.forEach((page, index) => {
    if (!page.text_en.trim()) {
      errors.push({ field: `pages.${index}.text_en`, message: `Page ${index + 1}: English text is required` });
    }
    if (!page.text_ro.trim()) {
      errors.push({ field: `pages.${index}.text_ro`, message: `Page ${index + 1}: Romanian text is required` });
    }
    if (!page.text_it.trim()) {
      errors.push({ field: `pages.${index}.text_it`, message: `Page ${index + 1}: Italian text is required` });
    }
    if (!page.imageId && !page.legacyAssetKey) {
      errors.push({ field: `pages.${index}.image`, message: `Page ${index + 1}: Image is required` });
    }
  });

  // Validate metadata
  if (!book.categoryId) {
    errors.push({ field: 'categoryId', message: VALIDATION_MESSAGES.categoryRequired });
  }
  if (!book.ageMin || !book.ageMax) {
    errors.push({ field: 'age', message: VALIDATION_MESSAGES.ageRequired });
  }
  if (!book.durationMin) {
    errors.push({ field: 'durationMin', message: VALIDATION_MESSAGES.durationRequired });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Get completion percentage
export function getBookCompletionPercentage(book: {
  cover: BookCover;
  pages: BookPage[];
  categoryId?: string;
  ageMin?: number;
  ageMax?: number;
  durationMin?: number;
}): number {
  let completed = 0;
  let total = 0;

  // Cover checks (4 items: 3 titles + 1 image)
  total += 4;
  if (book.cover.title_en.trim()) completed++;
  if (book.cover.title_ro.trim()) completed++;
  if (book.cover.title_it.trim()) completed++;
  if (book.cover.imageId || book.cover.legacyAssetKey) completed++;

  // Page checks (4 items per page: 3 texts + 1 image)
  book.pages.forEach(page => {
    total += 4;
    if (page.text_en.trim()) completed++;
    if (page.text_ro.trim()) completed++;
    if (page.text_it.trim()) completed++;
    if (page.imageId || page.legacyAssetKey) completed++;
  });

  // Metadata checks (3 items)
  total += 3;
  if (book.categoryId) completed++;
  if (book.ageMin && book.ageMax) completed++;
  if (book.durationMin) completed++;

  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

// Get missing items for book
export function getMissingItems(book: {
  cover: BookCover;
  pages: BookPage[];
  categoryId?: string;
  ageMin?: number;
  ageMax?: number;
  durationMin?: number;
}): string[] {
  const missing: string[] = [];

  // Cover
  if (!book.cover.title_en.trim()) missing.push('Cover: English title');
  if (!book.cover.title_ro.trim()) missing.push('Cover: Romanian title');
  if (!book.cover.title_it.trim()) missing.push('Cover: Italian title');
  if (!book.cover.imageId && !book.cover.legacyAssetKey) missing.push('Cover: Image');

  // Pages
  book.pages.forEach((page, index) => {
    if (!page.text_en.trim()) missing.push(`Page ${index + 1}: English text`);
    if (!page.text_ro.trim()) missing.push(`Page ${index + 1}: Romanian text`);
    if (!page.text_it.trim()) missing.push(`Page ${index + 1}: Italian text`);
    if (!page.imageId && !page.legacyAssetKey) missing.push(`Page ${index + 1}: Image`);
  });

  // Metadata
  if (!book.categoryId) missing.push('Category');
  if (!book.ageMin || !book.ageMax) missing.push('Age range');
  if (!book.durationMin) missing.push('Duration');

  return missing;
}

// Get text by language
export function getLocalizedText<T extends Record<string, string>>(
  obj: T,
  language: Language,
  fallback: Language = 'en'
): string {
  const key = language as keyof T;
  const fallbackKey = fallback as keyof T;
  return obj[key] || obj[fallbackKey] || '';
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

// File size formatter
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

import { MAX_IMAGE_SIZE } from './constants';

// Check if file is valid image
export function isValidImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = MAX_IMAGE_SIZE;

  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please upload JPG, PNG, or WebP.' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'File too large. Maximum size is 15MB.' };
  }

  return { valid: true };
}

// Generate unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Deep clone object
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Check if objects are equal
export function isEqual(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Sort by key
export function sortBy<T>(arr: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
  return [...arr].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

// Group by key
export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((groups, item) => {
    const group = String(item[key]);
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}
