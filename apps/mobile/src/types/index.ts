// Shared types for mobile app

export interface Story {
  _id: string;
  storyKey: string;
  categoryId: string;
  ageMin: number;
  ageMax: number;
  durationMin: number;
  tags_en: string[];
  tags_ro: string[];
  tags_it: string[];
  seriesId?: string;
  episodeNo?: number;
  locales: {
    en: StoryLocale;
    ro: StoryLocale;
    it: StoryLocale;
  };
  hasAccess?: boolean;
  isLocked?: boolean;
}

export interface StoryLocale {
  title: string;
  text: string;
  parentQuestions: string[];
}

export interface Category {
  _id: string;
  slug: string;
  order: number;
  name_en: string;
  name_ro: string;
  name_it: string;
  description_en: string;
  description_ro: string;
  description_it: string;
  iconKey: string;
  isActive: boolean;
}

export interface User {
  _id: string;
  email: string;
  name?: string;
  entitlementActive: boolean;
  entitlementExpiresAt?: number;
  preferredLanguage: "en" | "ro" | "it";
}

export interface ChildProfile {
  _id: string;
  userId: string;
  nickname: string;
  ageBracket: number;
  preferences: string[];
  isActive: boolean;
}
