'use client';

import { cn } from '../../lib/utils';
import { Button } from './Button';
import { FileX, Search, BookOpen, Users, FolderOpen } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('empty-state', className)}>
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Preset empty states
export function NoBooksEmptyState({ onCreateBook }: { onCreateBook: () => void }) {
  return (
    <EmptyState
      icon={<BookOpen size={48} className="text-gray-300" />}
      title="No books yet"
      description="Get started by creating your first book"
      action={{ label: 'Create Book', onClick: onCreateBook }}
    />
  );
}

export function NoSearchResultsEmptyState({ query }: { query: string }) {
  return (
    <EmptyState
      icon={<Search size={48} className="text-gray-300" />}
      title="No results found"
      description={`No items match "${query}". Try adjusting your search.`}
    />
  );
}

export function NoUsersEmptyState() {
  return (
    <EmptyState
      icon={<Users size={48} className="text-gray-300" />}
      title="No users yet"
      description="Users will appear here once they sign up"
    />
  );
}

export function NoCategoriesEmptyState({ onCreateCategory }: { onCreateCategory: () => void }) {
  return (
    <EmptyState
      icon={<FolderOpen size={48} className="text-gray-300" />}
      title="No categories yet"
      description="Create categories to organize your books"
      action={{ label: 'Create Category', onClick: onCreateCategory }}
    />
  );
}
