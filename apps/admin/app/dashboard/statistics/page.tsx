'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { useRole } from '../../../hooks/useAuth';
import { Header } from '../../../components/layout/Header';
import { AdminOnly } from '../../../components/layout/RoleGuard';
import { Card, CardTitle } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { PageLoading, SkeletonStat } from '../../../components/ui/Loading';
import { formatNumber, formatPercentage } from '../../../lib/utils';
import { CATEGORY_ICONS, CATEGORY_COLORS } from '../../../lib/constants';
import {
  Users,
  CreditCard,
  BookOpen,
  Eye,
  TrendingUp,
  TrendingDown,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

export default function StatisticsPage() {
  const { role } = useRole();
  const stats = useQuery(api.statistics.getDashboardStats);
  const userGrowth = useQuery(api.statistics.getUserGrowthData, { days: 30 });
  const readingData = useQuery(api.statistics.getReadingData, { days: 30 });

  const isLoading = stats === undefined;

  const COLORS = ['#7C4DFF', '#06B6D4', '#EC4899', '#F97316', '#10B981', '#3B82F6'];

  return (
    <AdminOnly currentRole={role}>
      <div className="p-6">
        <Header
          title="Statistics"
          subtitle="Overview of your platform metrics"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Statistics' },
          ]}
        />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <SkeletonStat key={i} />
            ))}
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Users */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Users</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {formatNumber(stats.users.total)}
                    </p>
                    <p className="text-sm text-success-600 mt-1 flex items-center gap-1">
                      <TrendingUp size={14} />
                      +{stats.users.newThisWeek} this week
                    </p>
                  </div>
                  <div className="p-3 bg-primary-100 rounded-lg">
                    <Users size={24} className="text-primary-600" />
                  </div>
                </div>
              </Card>

              {/* Active Subscriptions */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Active Subscriptions</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {formatNumber(stats.subscriptions.total)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatPercentage(stats.subscriptions.activePercentage)} of users
                    </p>
                  </div>
                  <div className="p-3 bg-success-100 rounded-lg">
                    <CreditCard size={24} className="text-success-600" />
                  </div>
                </div>
              </Card>

              {/* Total Books */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Books</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {formatNumber(stats.books.total)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {stats.books.published} published
                    </p>
                  </div>
                  <div className="p-3 bg-info-100 rounded-lg">
                    <BookOpen size={24} className="text-info-600" />
                  </div>
                </div>
              </Card>

              {/* Total Reads */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Reads</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {formatNumber(stats.totalReads)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      All time
                    </p>
                  </div>
                  <div className="p-3 bg-warning-100 rounded-lg">
                    <Eye size={24} className="text-warning-600" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* User Growth Chart */}
              <Card className="p-6">
                <CardTitle className="mb-4">New Users (Last 30 Days)</CardTitle>
                <div className="h-[300px]">
                  {userGrowth && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={userGrowth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => new Date(value).getDate().toString()}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          labelFormatter={(value) => new Date(value).toLocaleDateString()}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="newUsers"
                          stroke="#7C4DFF"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Card>

              {/* Subscription Distribution */}
              <Card className="p-6">
                <CardTitle className="mb-4">Subscription Types</CardTitle>
                <div className="h-[300px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Monthly', value: stats.subscriptions.monthly },
                          { name: 'Yearly', value: stats.subscriptions.yearly },
                          { name: 'Trial', value: stats.subscriptions.trial },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        <Cell fill="#3B82F6" />
                        <Cell fill="#10B981" />
                        <Cell fill="#F59E0B" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-info-500" />
                    <span className="text-sm text-gray-600">Monthly ({stats.subscriptions.monthly})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-success-500" />
                    <span className="text-sm text-gray-600">Yearly ({stats.subscriptions.yearly})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-warning-500" />
                    <span className="text-sm text-gray-600">Trial ({stats.subscriptions.trial})</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Stories */}
              <Card className="p-6 lg:col-span-2">
                <CardTitle className="mb-4">Top Stories</CardTitle>
                <div className="space-y-3">
                  {stats.topBooks.slice(0, 5).map((book, index) => (
                    <div
                      key={book.bookKey}
                      className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-8 h-8 flex items-center justify-center bg-primary-100 rounded-full text-primary-600 font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{book.title}</p>
                        <p className="text-sm text-gray-500">{book.bookKey}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{formatNumber(book.readCount)}</p>
                        <p className="text-sm text-gray-500">reads</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Language Distribution */}
              <Card className="p-6">
                <CardTitle className="mb-4">Users by Language</CardTitle>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">🇬🇧 English</span>
                      <span className="text-sm text-gray-500">{stats.languageDistribution.en}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500"
                        style={{
                          width: `${(stats.languageDistribution.en / stats.users.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">🇷🇴 Romanian</span>
                      <span className="text-sm text-gray-500">{stats.languageDistribution.ro}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-info-500"
                        style={{
                          width: `${(stats.languageDistribution.ro / stats.users.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">🇮🇹 Italian</span>
                      <span className="text-sm text-gray-500">{stats.languageDistribution.it}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success-500"
                        style={{
                          width: `${(stats.languageDistribution.it / stats.users.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Category Distribution */}
                <CardTitle className="mb-4 mt-8">Books by Category</CardTitle>
                <div className="space-y-3">
                  {stats.categoryDistribution.map((cat) => (
                    <div key={cat.categoryId} className="flex items-center gap-3">
                      <span className="text-lg">{CATEGORY_ICONS[cat.categorySlug] || '📚'}</span>
                      <span className="flex-1 text-sm text-gray-700">{cat.categoryName}</span>
                      <Badge variant="gray">{cat.count}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </AdminOnly>
  );
}
