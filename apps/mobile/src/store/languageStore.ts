import { create } from 'zustand';

type Language = 'ro' | 'en' | 'it';

interface LanguageState {
    language: Language;
    setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
    language: 'ro', // Default
    setLanguage: (lang) => set({ language: lang }),
}));
