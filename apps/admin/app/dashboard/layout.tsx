'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../hooks/useAuth';
import { Sidebar } from '../../components/layout/Sidebar';
import { PageLoading } from '../../components/ui/Loading';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, role, name, email, clearAuth } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLogout = () => {
    clearAuth();
    router.replace('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-primary flex items-center justify-center">
        <PageLoading message="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated || !role) {
    return null;
  }

  return (
    <div className="min-h-screen bg-surface-primary">
      <Sidebar
        userRole={role}
        userName={name || email || 'Admin'}
        onLogout={handleLogout}
      />
      <main className="ml-64 transition-all duration-300">
        {children}
      </main>
    </div>
  );
}
