import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Id } from "../../../../convex/_generated/dataModel";
import { useUserStore } from "./userStore";

interface AuthState {
  userId: Id<"users"> | null;
  sessionToken: string | null;
  sessionExpiresAt: number | null;
  setAuthUser: (data: {
    userId: Id<"users">;
    sessionToken: string;
    expiresAt: number;
  }) => void;
  signOut: () => void;
  isSessionValid: () => boolean;
  updateSessionExpiry: (expiresAt: number) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      userId: null,
      sessionToken: null,
      sessionExpiresAt: null,

      setAuthUser: ({ userId, sessionToken, expiresAt }) => {
        set({
          userId,
          sessionToken,
          sessionExpiresAt: expiresAt,
        });
        // Initialize user-specific data when logging in
        if (userId) {
          useUserStore.getState().initializeForUser(userId);
        }
      },

      signOut: () => {
        // Clear user-specific data before signing out
        useUserStore.getState().clearUserData();
        set({
          userId: null,
          sessionToken: null,
          sessionExpiresAt: null,
        });
      },

      isSessionValid: () => {
        const { sessionToken, sessionExpiresAt } = get();
        if (!sessionToken || !sessionExpiresAt) {
          return false;
        }
        // Add 1 minute buffer to prevent edge cases
        return Date.now() < sessionExpiresAt - 60000;
      },

      updateSessionExpiry: (expiresAt: number) => {
        set({ sessionExpiresAt: expiresAt });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist essential auth data
      partialize: (state) => ({
        userId: state.userId,
        sessionToken: state.sessionToken,
        sessionExpiresAt: state.sessionExpiresAt,
      }),
    }
  )
);
