import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

// Hook to get all published books from Convex
export function usePublishedBooks(categorySlug?: string, limit?: number) {
  const books = useQuery(api.books.getPublishedBooksForApp, {
    categorySlug,
    limit,
  });

  return {
    books: books || [],
    isLoading: books === undefined,
  };
}

// Hook to get a single published book by key
export function usePublishedBook(bookKey: string | null) {
  const book = useQuery(
    api.books.getPublishedBookByKey,
    bookKey ? { bookKey } : "skip"
  );

  return {
    book,
    isLoading: book === undefined,
    notFound: book === null,
  };
}

// Type for a published book from Convex
export interface ConvexBook {
  _id: string;
  bookKey: string;
  cover: {
    imageId?: string;
    legacyAssetKey?: string;
    imageUrl: string | null;
    title_en: string;
    title_ro: string;
    title_it: string;
  };
  pages: Array<{
    pageNumber: number;
    imageId?: string;
    legacyAssetKey?: string;
    imageUrl: string | null;
    text_en: string;
    text_ro: string;
    text_it: string;
    // Audio fields (added Phase 1 schema, Phase 5 consumer)
    audioUrl_en?: string;
    audioUrl_ro?: string;
    audioStorageId_en?: string;
    audioStorageId_ro?: string;
    audioStatus_en?: "pending" | "generating" | "done" | "failed";
    audioStatus_ro?: "pending" | "generating" | "done" | "failed";
    audioGeneratedAt_en?: number;
    audioGeneratedAt_ro?: number;
  }>;
  category: {
    slug: string;
    name_en: string;
    name_ro: string;
    name_it: string;
  } | null;
  ageMin: number;
  ageMax: number;
  durationMin: number;
  readCount: number;
  favoriteCount: number;
  publishedAt: number | null;
}
