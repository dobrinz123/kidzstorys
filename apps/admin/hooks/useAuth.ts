'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { UserRole } from '../types';
import { Id } from '@convex/_generated/dataModel';

interface AdminAuthState {
  // Session token - the source of truth for auth
  sessionToken: string | null;
  sessionExpiresAt: number | null;
  // Cached user data (verified from server)
  userId: Id<"users"> | null;
  adminUserId: Id<"adminUsers"> | null;
  email: string | null;
  name: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AdminAuthActions {
  setAuth: (auth: {
    userId: Id<"users">;
    adminUserId: Id<"adminUsers">;
    sessionToken: string;
    expiresAt: number;
    email: string;
    name?: string;
    role: UserRole;
  }) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  updateFromServer: (serverData: {
    userId: Id<"users">;
    adminUserId: Id<"adminUsers">;
    email: string;
    name?: string | null;
    role: UserRole;
    sessionExpiresAt: number;
  } | null) => void;
}

type AdminAuthStore = AdminAuthState & AdminAuthActions;

const initialState: AdminAuthState = {
  sessionToken: null,
  sessionExpiresAt: null,
  userId: null,
  adminUserId: null,
  email: null,
  name: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,
};

export const useAuthStore = create<AdminAuthStore>()(
  persist(
    (set) => ({
      ...initialState,

      setAuth: (auth) =>
        set({
          sessionToken: auth.sessionToken,
          sessionExpiresAt: auth.expiresAt,
          userId: auth.userId,
          adminUserId: auth.adminUserId,
          email: auth.email,
          name: auth.name || null,
          role: auth.role,
          isAuthenticated: true,
          isLoading: false,
        }),

      clearAuth: () =>
        set({
          ...initialState,
          isLoading: false,
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      updateFromServer: (serverData) => {
        if (!serverData) {
          // Server says not authenticated - clear local state
          set({
            ...initialState,
            isLoading: false,
          });
        } else {
          // Update with server-verified data
          set({
            userId: serverData.userId,
            adminUserId: serverData.adminUserId,
            email: serverData.email,
            name: serverData.name || null,
            role: serverData.role,
            sessionExpiresAt: serverData.sessionExpiresAt,
            isAuthenticated: true,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'admin-auth-storage',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') {
          return localStorage;
        }
        return {
          getItem: () => null,
          setItem: () => { },
          removeItem: () => { },
        };
      }),
      // Only persist session token - other data is verified from server
      partialize: (state) => ({
        sessionToken: state.sessionToken,
        sessionExpiresAt: state.sessionExpiresAt,
        // Cache these for immediate UI, but always verify with server
        userId: state.userId,
        adminUserId: state.adminUserId,
        email: state.email,
        name: state.name,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // After rehydration, check if token is valid before setting loading
        if (state?.sessionExpiresAt && Date.now() > state.sessionExpiresAt) {
          // Token expired, clear auth immediately
          state.clearAuth();
        } else if (state?.sessionToken) {
          // Has valid token, mark as needing server verification
          state.setLoading(true);
        } else {
          // No token, don't load
          state?.setLoading(false);
        }
      },
    }
  )
);

// Custom hook for auth operations with server verification
export function useAuth() {
  const store = useAuthStore();

  // Verify session with server whenever we have a token
  const serverSession = useQuery(
    api.admin.validateAdminSession,
    store.sessionToken ? { sessionToken: store.sessionToken } : 'skip'
  );

  // Update local state when server responds
  useEffect(() => {
    // Absolute safety timeout - ALWAYS runs to prevent infinite loading
    const absoluteTimeout = setTimeout(() => {
      if (store.isLoading) {
        console.warn('Absolute timeout reached (8s). Forcing loading end.');
        store.setLoading(false);
      }
    }, 8000);

    // If no session token, we're not authenticated - stop loading immediately
    if (!store.sessionToken) {
      store.setLoading(false);
      clearTimeout(absoluteTimeout);
      return () => {};
    }

    // If we have a response from server
    if (serverSession !== undefined) {
      clearTimeout(absoluteTimeout);
      if (serverSession === null) {
        // Session invalid on server - clear local auth
        store.clearAuth();
      } else {
        // Update with server-verified data
        store.updateFromServer(serverSession);
      }
      return () => {};
    }

    // Cleanup
    return () => clearTimeout(absoluteTimeout);
  }, [serverSession, store.sessionToken]); // Removed store.isLoading from deps to prevent re-render loops

  const login = async (
    loginMutation: (args: { email: string; password: string }) => Promise<{
      userId: Id<"users">;
      adminUserId: Id<"adminUsers">;
      sessionToken: string;
      expiresAt: number;
      email: string;
      name?: string;
      role: UserRole;
    }>,
    email: string,
    password: string
  ) => {
    store.setLoading(true);
    try {
      const result = await loginMutation({ email, password });
      store.setAuth(result);
      return result;
    } catch (error) {
      store.clearAuth();
      throw error;
    }
  };

  const logout = async (logoutMutation?: (args: { sessionToken: string }) => Promise<{ success: boolean }>) => {
    if (logoutMutation && store.sessionToken) {
      try {
        await logoutMutation({ sessionToken: store.sessionToken });
      } catch (e) {
        // Ignore errors, still clear local state
      }
    }
    store.clearAuth();
  };

  // Role checks use server-verified role
  const isAdmin = () => store.role === 'admin';
  const isEditor = () => store.role === 'editor';
  const hasRole = (roles: UserRole[]) => store.role && roles.includes(store.role);

  // Check if session is valid (not expired)
  const isSessionValid = () => {
    if (!store.sessionToken || !store.sessionExpiresAt) return false;
    return Date.now() < store.sessionExpiresAt - 60000; // 1 minute buffer
  };

  return {
    ...store,
    login,
    logout,
    isAdmin,
    isEditor,
    hasRole,
    isSessionValid,
  };
}

// Hook for role-based access - uses server-verified role
export function useRole() {
  const { role, isAuthenticated } = useAuthStore();

  return {
    role,
    isAuthenticated,
    isAdmin: role === 'admin',
    isEditor: role === 'editor',
    canAccessStatistics: role === 'admin',
    canAccessUsers: role === 'admin',
    canAccessSettings: role === 'admin',
    canManageCategories: role === 'admin',
    canCreateBooks: role === 'admin' || role === 'editor',
    canEditBooks: role === 'admin' || role === 'editor',
    canDeleteBooks: role === 'admin',
    canPublishBooks: role === 'admin' || role === 'editor',
  };
}
