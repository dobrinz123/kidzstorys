import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

interface UserState {
    myList: string[];
    readingProgress: Record<string, number>; // storyId -> pageIndex
    storyViews: Record<string, number>; // storyId -> count
    avatarId: string | null;
    currentUserId: string | null;

    setAvatar: (id: string) => void;
    addToMyList: (storyId: string) => void;
    removeFromMyList: (storyId: string) => void;
    updateProgress: (storyId: string, pageIndex: number) => void;
    removeProgress: (storyId: string) => void;
    incrementView: (storyId: string) => void;
    initializeForUser: (userId: string) => Promise<void>;
    clearUserData: () => void;
}

// Storage helper
const getStorage = () => {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        return localStorage;
    }
    return AsyncStorage;
};

// Get storage key for a specific user
const getUserStorageKey = (userId: string | null) => {
    if (!userId) return 'user-storage-v2-guest';
    return `user-storage-v2-${userId}`;
};

// Default state for new users
const getDefaultState = () => ({
    myList: [],
    readingProgress: {},
    storyViews: {},
    avatarId: '1',
    currentUserId: null,
});

export const useUserStore = create<UserState>()(
    persist(
        (set, get) => ({
            myList: [],
            readingProgress: {},
            storyViews: {},
            avatarId: '1',
            currentUserId: null,

            setAvatar: (id) => set({ avatarId: id }),

            addToMyList: (storyId) =>
                set((state) => ({
                    myList: (state.myList || []).includes(storyId)
                        ? state.myList
                        : [...(state.myList || []), storyId],
                })),

            removeFromMyList: (storyId) =>
                set((state) => ({
                    myList: (state.myList || []).filter((id) => id !== storyId),
                })),

            updateProgress: (storyId, pageIndex) =>
                set((state) => ({
                    readingProgress: {
                        ...(state.readingProgress || {}),
                        [storyId]: pageIndex,
                    },
                })),

            removeProgress: (storyId) =>
                set((state) => {
                    const newProgress = { ...(state.readingProgress || {}) };
                    delete newProgress[storyId];
                    return { readingProgress: newProgress };
                }),

            incrementView: (storyId) =>
                set((state) => ({
                    storyViews: {
                        ...(state.storyViews || {}),
                        [storyId]: ((state.storyViews || {})[storyId] || 0) + 1,
                    },
                })),

            // Initialize store for a specific user - loads their data from storage
            initializeForUser: async (userId: string) => {
                const storage = getStorage();
                const storageKey = getUserStorageKey(userId);

                try {
                    let storedData: string | null = null;

                    if (Platform.OS === 'web') {
                        storedData = (storage as Storage).getItem(storageKey);
                    } else {
                        storedData = await (storage as typeof AsyncStorage).getItem(storageKey);
                    }

                    if (storedData) {
                        const parsed = JSON.parse(storedData);
                        const state = parsed.state || {};
                        set({
                            myList: state.myList || [],
                            readingProgress: state.readingProgress || {},
                            storyViews: state.storyViews || {},
                            avatarId: state.avatarId || '1',
                            currentUserId: userId,
                        });
                    } else {
                        // New user - set default state with user ID
                        set({
                            ...getDefaultState(),
                            currentUserId: userId,
                        });
                    }

                    // Save current user data to their specific storage key
                    const currentState = get();
                    const dataToStore = JSON.stringify({
                        state: {
                            myList: currentState.myList,
                            readingProgress: currentState.readingProgress,
                            storyViews: currentState.storyViews,
                            avatarId: currentState.avatarId,
                            currentUserId: userId,
                        },
                        version: 1,
                    });

                    if (Platform.OS === 'web') {
                        (storage as Storage).setItem(storageKey, dataToStore);
                    } else {
                        await (storage as typeof AsyncStorage).setItem(storageKey, dataToStore);
                    }
                } catch (error) {
                    console.error('[UserStore] Error initializing for user:', error);
                    set({
                        ...getDefaultState(),
                        currentUserId: userId,
                    });
                }
            },

            // Clear user data on sign out - resets to default state
            clearUserData: () => {
                set(getDefaultState());
            },
        }),
        {
            name: 'user-storage-v2-active',
            storage: createJSONStorage(() => getStorage()),
            skipHydration: false,
            version: 1,
            // Custom partialize to save user data to the correct key
            partialize: (state) => ({
                myList: state.myList,
                readingProgress: state.readingProgress,
                storyViews: state.storyViews,
                avatarId: state.avatarId,
                currentUserId: state.currentUserId,
            }),
            // After rehydration, sync to user-specific storage
            onRehydrateStorage: () => (state) => {
                if (state?.currentUserId) {
                    // User was logged in, their data is loaded
                    console.log('[UserStore] Rehydrated for user:', state.currentUserId);
                }
            },
        }
    )
);

// Helper to persist current user's data to their specific storage key
export const saveUserDataToStorage = async () => {
    const state = useUserStore.getState();
    if (!state.currentUserId) return;

    const storage = getStorage();
    const storageKey = getUserStorageKey(state.currentUserId);

    const dataToStore = JSON.stringify({
        state: {
            myList: state.myList,
            readingProgress: state.readingProgress,
            storyViews: state.storyViews,
            avatarId: state.avatarId,
            currentUserId: state.currentUserId,
        },
        version: 1,
    });

    try {
        if (Platform.OS === 'web') {
            (storage as Storage).setItem(storageKey, dataToStore);
        } else {
            await (storage as typeof AsyncStorage).setItem(storageKey, dataToStore);
        }
    } catch (error) {
        console.error('[UserStore] Error saving user data:', error);
    }
};

// Subscribe to state changes and auto-save to user-specific storage
useUserStore.subscribe((state, prevState) => {
    // Only save if there's a logged in user and data actually changed
    if (state.currentUserId && (
        state.myList !== prevState.myList ||
        state.readingProgress !== prevState.readingProgress ||
        state.storyViews !== prevState.storyViews ||
        state.avatarId !== prevState.avatarId
    )) {
        saveUserDataToStorage();
    }
});
