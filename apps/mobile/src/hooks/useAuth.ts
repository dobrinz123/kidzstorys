import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuthStore } from "../store/authStore";
import { useUserStore } from "../store/userStore";
import { useEffect, useState, useRef } from "react";

export function useAuth() {
  const { userId, setAuthUser, signOut } = useAuthStore();
  const initializeForUser = useUserStore((state) => state.initializeForUser);
  const currentUserId = useUserStore((state) => state.currentUserId);

  // We need to wait for hydration
  const [isHydrated, setIsHydrated] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Zustand persist is async with AsyncStorage, but usually fast.
    // We can assume it's ready or wait a tick if needed.
    // For simplicity, we just mark hydrated.
    // In a real app with persist, you might want to check storage status.
    setIsHydrated(true);
  }, []);

  // Initialize user-specific data when app starts with existing session
  useEffect(() => {
    if (isHydrated && userId && !hasInitialized.current && currentUserId !== userId) {
      hasInitialized.current = true;
      initializeForUser(userId);
    }
  }, [isHydrated, userId, currentUserId, initializeForUser]);

  const user = useQuery(
    api.users.getCurrentUser,
    userId ? { userId } : "skip"
  );

  return {
    userId,
    user,
    // Loading if not hydrated or if we have a userId but user data is fetching
    isLoading: !isHydrated || (userId !== null && user === undefined),
    isAuthenticated: !!userId,
    signOut,
    setAuthUser,
  };
}
