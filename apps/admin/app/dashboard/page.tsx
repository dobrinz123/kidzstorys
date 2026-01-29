'use client';

import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { useRole } from '../../hooks/useAuth';
import { Header } from '../../components/layout/Header';
import { Card, CardTitle, CardDescription } from '../../components/ui/Card';
import { formatNumber } from '../../lib/utils';
import {
  BookOpen,
  FolderOpen,
  BarChart3,
  Users,
  Settings,
  Plus,
  TrendingUp,
  Clock,
} from 'lucide-react';

interface QuickActionCard {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  adminOnly?: boolean;
}

const quickActions: QuickActionCard[] = [
  {
    href: '/dashboard/books',
    icon: <BookOpen size={24} />,
    title: 'Books',
    description: 'Create and manage story books',
    color: 'bg-primary-500',
  },
  {
    href: '/dashboard/books/new',
    icon: <Plus size={24} />,
    title: 'New Book',
    description: 'Create a new book from scratch',
    color: 'bg-success-500',
  },
  {
    href: '/dashboard/categories',
    icon: <FolderOpen size={24} />,
    title: 'Categories',
    description: 'Manage story categories',
    color: 'bg-info-500',
    adminOnly: true,
  },
  {
    href: '/dashboard/statistics',
    icon: <BarChart3 size={24} />,
    title: 'Statistics',
    description: 'View analytics and metrics',
    color: 'bg-warning-500',
    adminOnly: true,
  },
  {
    href: '/dashboard/users',
    icon: <Users size={24} />,
    title: 'Users',
    description: 'View user activity and subscriptions',
    color: 'bg-error-500',
    adminOnly: true,
  },
  {
    href: '/dashboard/settings',
    icon: <Settings size={24} />,
    title: 'Settings',
    description: 'Configure system settings',
    color: 'bg-gray-500',
    adminOnly: true,
  },
];

export default function DashboardPage() {
  const { isAdmin, canAccessStatistics } = useRole();
  const stats = useQuery(api.statistics.getDashboardStats);

  // Filter actions based on role
  const availableActions = quickActions.filter(
    (action) => !action.adminOnly || isAdmin
  );

  const isLoadingStats = stats === undefined;

  return (
    <div className="p-6">
      <Header
        title="Dashboard"
        subtitle={`Welcome back! You're logged in as ${isAdmin ? 'Administrator' : 'Editor'}.`}
      />

      {/* Quick Stats (Admin only) */}
      {canAccessStatistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-100 rounded-lg">
                <BookOpen size={24} className="text-primary-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingStats ? '...' : formatNumber(stats?.books.total || 0)}
                </p>
                <p className="text-sm text-gray-500">Total Books</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-success-100 rounded-lg">
                <Users size={24} className="text-success-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingStats ? '...' : formatNumber(stats?.users.active || 0)}
                </p>
                <p className="text-sm text-gray-500">Active Users</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-warning-100 rounded-lg">
                <TrendingUp size={24} className="text-warning-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingStats ? '...' : formatNumber(stats?.totalReads || 0)}
                </p>
                <p className="text-sm text-gray-500">Total Reads</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-info-100 rounded-lg">
                <Clock size={24} className="text-info-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingStats ? '...' : formatNumber(stats?.books.newThisWeek || 0)}
                </p>
                <p className="text-sm text-gray-500">New This Week</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card hover className="p-6 h-full">
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-lg text-white ${action.color}`}
                  >
                    {action.icon}
                  </div>
                  <div>
                    <CardTitle className="mb-1">{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity (placeholder) */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <Card className="p-6">
          <div className="text-center text-gray-500 py-8">
            <Clock size={48} className="mx-auto mb-4 text-gray-300" />
            <p>Activity tracking coming soon</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
