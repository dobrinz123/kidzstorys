'use client';

import { cn } from '../../lib/utils';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'gray';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

const variantClasses = {
  primary: 'badge-primary',
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
  info: 'badge-info',
  gray: 'badge-gray',
};

const dotColors = {
  primary: 'bg-primary-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  error: 'bg-error-500',
  info: 'bg-info-500',
  gray: 'bg-gray-500',
};

export function Badge({
  children,
  variant = 'gray',
  size = 'md',
  dot = false,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        variantClasses[variant],
        size === 'sm' && 'text-[10px] px-2 py-0',
        className
      )}
    >
      {dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full mr-1.5', dotColors[variant])}
        />
      )}
      {children}
    </span>
  );
}

// Status badge specifically for book status
export function StatusBadge({ status }: { status: 'draft' | 'ready' | 'published' }) {
  const config = {
    draft: { variant: 'gray' as const, label: 'Draft' },
    ready: { variant: 'warning' as const, label: 'Ready' },
    published: { variant: 'success' as const, label: 'Published' },
  };

  const { variant, label } = config[status];

  return (
    <Badge variant={variant} dot>
      {label}
    </Badge>
  );
}

// Subscription type badge
export function SubscriptionBadge({
  type,
}: {
  type: 'monthly' | 'yearly' | 'trial' | null;
}) {
  if (!type) return <Badge variant="gray">None</Badge>;

  const config = {
    monthly: { variant: 'info' as const, label: 'Monthly' },
    yearly: { variant: 'success' as const, label: 'Yearly' },
    trial: { variant: 'warning' as const, label: 'Trial' },
  };

  const { variant, label } = config[type];

  return <Badge variant={variant}>{label}</Badge>;
}

// Role badge
export function RoleBadge({ role }: { role: 'admin' | 'editor' }) {
  const config = {
    admin: { variant: 'primary' as const, label: 'Admin' },
    editor: { variant: 'info' as const, label: 'Editor' },
  };

  const { variant, label } = config[role];

  return <Badge variant={variant}>{label}</Badge>;
}
