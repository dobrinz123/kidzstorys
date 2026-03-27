import { create } from 'zustand';

interface AudiobookState {
    isAudiobookEnabled: boolean;
    toggleAudiobook: () => void;
    resetAudiobook: () => void;
}

export const useAudiobookStore = create<AudiobookState>((set) => ({
    isAudiobookEnabled: false,
    toggleAudiobook: () => set((state) => ({ isAudiobookEnabled: !state.isAudiobookEnabled })),
    resetAudiobook: () => set({ isAudiobookEnabled: false }),
}));
