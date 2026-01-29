import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Id } from "../../../../convex/_generated/dataModel";
import { useUserStore } from "./userStore";

interface AuthState {
    userId: Id<"users"> | null;
    setAuthUser: (userId: Id<"users"> | null) => void;
    signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            userId: null,
            setAuthUser: (userId) => {
                set({ userId });
                // Initialize user-specific data when logging in
                if (userId) {
                    useUserStore.getState().initializeForUser(userId);
                }
            },
            signOut: () => {
                // Clear user-specific data before signing out
                useUserStore.getState().clearUserData();
                set({ userId: null });
            },
        }),
        {
            name: "auth-storage",
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
