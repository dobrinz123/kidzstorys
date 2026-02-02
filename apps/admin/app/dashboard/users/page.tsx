'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { useRole, useAuthStore } from '../../../hooks/useAuth';
import { Header, HeaderSearch } from '../../../components/layout/Header';
import { AdminOnly } from '../../../components/layout/RoleGuard';
import { Card } from '../../../components/ui/Card';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { SubscriptionBadge, Badge } from '../../../components/ui/Badge';
import { NoUsersEmptyState, NoSearchResultsEmptyState } from '../../../components/ui/EmptyState';
import { SkeletonTable } from '../../../components/ui/Loading';
import { formatDate, formatRelativeTime } from '../../../lib/utils';
import {
  Mail,
  Calendar,
  Globe,
  Clock,
  Trash2,
} from 'lucide-react';

export default function UsersPage() {
  const { role } = useRole();
  const { sessionToken } = useAuthStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{ cleaned: number; users: string[] } | null>(null);

  const cleanupMutation = useMutation(api.admin.cleanupInvalidTrialStatus);

  const usersResult = useQuery(api.statistics.listUsers, {
    filter: filter as any,
    search: search || undefined,
    limit: 50,
  });

  const isLoading = usersResult === undefined;
  const users = usersResult?.users || [];
  const total = usersResult?.total || 0;

  const filterOptions = [
    { value: 'all', label: 'All Users' },
    { value: 'active', label: 'Active Subscriptions' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'trial', label: 'Trial' },
  ];

  const languageFlags: Record<string, string> = {
    en: '🇬🇧',
    ro: '🇷🇴',
    it: '🇮🇹',
  };

  const handleCleanupTrials = async () => {
    if (!sessionToken) return;
    setIsCleaningUp(true);
    setCleanupResult(null);
    try {
      const result = await cleanupMutation({ sessionToken });
      setCleanupResult(result);
    } catch (error) {
      console.error('Cleanup failed:', error);
    } finally {
      setIsCleaningUp(false);
    }
  };

  return (
    <AdminOnly currentRole={role}>
      <div className="p-6">
        <Header
          title="Users"
          subtitle={`Manage user accounts and subscriptions (${total} total)`}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Users' },
          ]}
        />

        {/* Cleanup Result Banner */}
        {cleanupResult && (
          <Card className="p-4 mb-4 bg-success-50 border-success-200">
            <div className="flex items-center gap-2 text-success-700">
              <Trash2 size={18} />
              <span>
                Cleaned up {cleanupResult.cleaned} users with invalid trial status
                {cleanupResult.users.length > 0 && (
                  <span className="ml-1">({cleanupResult.users.join(', ')})</span>
                )}
              </span>
            </div>
          </Card>
        )}

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <HeaderSearch
                placeholder="Search by email or name..."
                value={search}
                onChange={setSearch}
              />
            </div>
            <Select
              options={filterOptions}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-48"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCleanupTrials}
              isLoading={isCleaningUp}
              leftIcon={<Trash2 size={16} />}
              title="Remove trial status from users who don't have active entitlements"
            >
              Cleanup Invalid Trials
            </Button>
          </div>
        </Card>

        {/* Users List */}
        {isLoading ? (
          <SkeletonTable rows={10} />
        ) : users.length === 0 ? (
          search ? (
            <NoSearchResultsEmptyState query={search} />
          ) : (
            <NoUsersEmptyState />
          )
        ) : (
          <Card padding="none">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Subscription</th>
                  <th>Language</th>
                  <th>Joined</th>
                  <th>Last Active</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-medium">
                            {user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.name || 'No name'}
                          </p>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail size={12} />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <SubscriptionBadge type={user.subscriptionType as "monthly" | "yearly" | "trial" | null} />
                        {user.entitlementActive && (
                          <span className="w-2 h-2 rounded-full bg-success-500" title="Active" />
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="text-lg" title={user.preferredLanguage.toUpperCase()}>
                        {languageFlags[user.preferredLanguage] || '🌐'}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-gray-600">
                        {formatDate(user.createdAt)}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-gray-500">
                        {user.lastActiveAt
                          ? formatRelativeTime(user.lastActiveAt)
                          : 'Never'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </AdminOnly>
  );
}
