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
        // After rehydration, mark as needing server verification
        state?.setLoading(true);
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
    // If no session token, we're not authenticated - stop loading
    if (!store.sessionToken) {
      if (store.isLoading) {
        store.setLoading(false);
      }
      return;
    }

    // If we have a token but query is still loading
    if (serverSession === undefined) {
      return;
    }

    if (serverSession === null) {
      // Session invalid on server - clear local auth
      store.clearAuth();
    } else {
      // Update with server-verified data
      store.updateFromServer(serverSession);
    }
    // Safety timeout: If server verification takes too long (e.g. 5s), stop loading
    // to allow the UI to make a decision (likely redirect to login if not verified)
    const timer = setTimeout(() => {
      if (store.isLoading && serverSession === undefined) {
        console.warn('Server session verification timed out. Resetting auth.');
        store.setLoading(false);
        // Optional: clear auth if we don't trust the persisted state without verification
        // store.clearAuth(); 
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [serverSession, store.sessionToken, store.isLoading]);

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
