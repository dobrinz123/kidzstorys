'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserRole } from '../types';
import { Id } from '@convex/_generated/dataModel';

interface AdminAuthState {
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
    email: string;
    name?: string;
    role: UserRole;
  }) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

type AdminAuthStore = AdminAuthState & AdminAuthActions;

const initialState: AdminAuthState = {
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
    }),
    {
      name: 'admin-auth-storage',
      storage: createJSONStorage(() => {
        // Check if we're in the browser
        if (typeof window !== 'undefined') {
          return localStorage;
        }
        // Return a no-op storage for SSR
        return {
          getItem: () => null,
          setItem: () => { },
          removeItem: () => { },
        };
      }),
      partialize: (state) => ({
        userId: state.userId,
        adminUserId: state.adminUserId,
        email: state.email,
        name: state.name,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setLoading(false);
      },
    }
  )
);

// Custom hook for auth operations
export function useAuth() {
  const store = useAuthStore();

  const login = async (
    loginMutation: (args: { email: string; password: string }) => Promise<{
      userId: Id<"users">;
      adminUserId: Id<"adminUsers">;
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

  const logout = () => {
    store.clearAuth();
  };

  const isAdmin = () => store.role === 'admin';
  const isEditor = () => store.role === 'editor';
  const hasRole = (roles: UserRole[]) => store.role && roles.includes(store.role);

  return {
    ...store,
    login,
    logout,
    isAdmin,
    isEditor,
    hasRole,
  };
}

// Hook for role-based access
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
