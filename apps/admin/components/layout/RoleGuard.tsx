'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { UserRole } from '../../types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  currentRole: UserRole | null;
  fallbackPath?: string;
}

export function RoleGuard({
  children,
  allowedRoles,
  currentRole,
  fallbackPath = '/dashboard',
}: RoleGuardProps) {
  const router = useRouter();

  useEffect(() => {
    if (currentRole && !allowedRoles.includes(currentRole)) {
      router.push(fallbackPath);
    }
  }, [currentRole, allowedRoles, fallbackPath, router]);

  // Show nothing while checking or if not authorized
  if (!currentRole || !allowedRoles.includes(currentRole)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="spinner-lg" />
      </div>
    );
  }

  return <>{children}</>;
}

// Higher-order component version
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: UserRole[]
) {
  return function GuardedComponent(props: P & { currentRole: UserRole | null }) {
    return (
      <RoleGuard allowedRoles={allowedRoles} currentRole={props.currentRole}>
        <Component {...props} />
      </RoleGuard>
    );
  };
}

// Admin only guard
export function AdminOnly({
  children,
  currentRole,
}: {
  children: React.ReactNode;
  currentRole: UserRole | null;
}) {
  return (
    <RoleGuard allowedRoles={['admin']} currentRole={currentRole}>
      {children}
    </RoleGuard>
  );
}

// Editor and above guard
export function EditorOrAdmin({
  children,
  currentRole,
}: {
  children: React.ReactNode;
  currentRole: UserRole | null;
}) {
  return (
    <RoleGuard allowedRoles={['admin', 'editor']} currentRole={currentRole}>
      {children}
    </RoleGuard>
  );
}
