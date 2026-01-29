'use client';

import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { useAuthStore, useRole } from '../../../hooks/useAuth';
import { Header } from '../../../components/layout/Header';
import { AdminOnly } from '../../../components/layout/RoleGuard';
import { Button } from '../../../components/ui/Button';
import { Card, CardTitle, CardDescription } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { ConfirmDialog } from '../../../components/ui/Modal';
import {
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export default function SettingsPage() {
  const { role } = useRole();
  const { adminUserId } = useAuthStore();
  const { success, error: showError } = useToast();

  const [isMigrating, setIsMigrating] = useState(false);
  const [showMigrationConfirm, setShowMigrationConfirm] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);

  const migrationStatus = useQuery(api.migration.getMigrationStatus);
  const migrateStories = useMutation(api.migration.migrateStoriesToBooks);

  const handleMigrate = async () => {
    if (!adminUserId) {
      showError('Not authenticated');
      return;
    }

    setIsMigrating(true);
    setMigrationResult(null);
    setShowMigrationConfirm(false);

    try {
      const result = await migrateStories({
        adminUserId,
        limit: 20, // Migrate 20 at a time
      });

      setMigrationResult(result);

      if (result.errors.length > 0) {
        showError(`Migrated ${result.migrated.length} stories with ${result.errors.length} errors`);
      } else {
        success(result.message);
      }
    } catch (err: any) {
      showError(err.message || 'Migration failed');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <AdminOnly currentRole={role}>
      <div className="p-6">
        <Header
          title="Settings"
          subtitle="System configuration and maintenance"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Settings' },
          ]}
        />

        {/* Migration Section */}
        <Card className="p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary-100 rounded-lg">
              <Database size={24} className="text-primary-600" />
            </div>
            <div className="flex-1">
              <CardTitle>Story Migration</CardTitle>
              <CardDescription className="mt-1">
                Migrate existing stories to the new books format with pages structure.
              </CardDescription>

              {/* Migration Status */}
              {migrationStatus && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Total Stories</p>
                      <p className="text-xl font-bold text-gray-900">
                        {migrationStatus.totalStories}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Migrated</p>
                      <p className="text-xl font-bold text-success-600">
                        {migrationStatus.migratedStories}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Remaining</p>
                      <p className="text-xl font-bold text-warning-600">
                        {migrationStatus.remainingStories}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Progress</p>
                      <p className="text-xl font-bold text-primary-600">
                        {migrationStatus.progress}%
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        migrationStatus.progress === 100 ? 'bg-success-500' : 'bg-primary-500'
                      }`}
                      style={{ width: `${migrationStatus.progress}%` }}
                    />
                  </div>

                  {migrationStatus.progress === 100 && (
                    <div className="flex items-center gap-2 mt-3 text-success-600">
                      <CheckCircle size={18} />
                      <span className="text-sm font-medium">All stories have been migrated!</span>
                    </div>
                  )}
                </div>
              )}

              {/* Migration Result */}
              {migrationResult && (
                <div className="mt-4 p-4 bg-primary-50 rounded-lg border border-primary-200">
                  <p className="font-medium text-primary-700 mb-2">Last Migration Result:</p>
                  <p className="text-sm text-primary-600">{migrationResult.message}</p>

                  {migrationResult.migrated.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">Migrated:</p>
                      <div className="flex flex-wrap gap-1">
                        {migrationResult.migrated.slice(0, 5).map((key: string) => (
                          <Badge key={key} variant="success" size="sm">
                            {key}
                          </Badge>
                        ))}
                        {migrationResult.migrated.length > 5 && (
                          <Badge variant="gray" size="sm">
                            +{migrationResult.migrated.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {migrationResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-error-500 mb-1">Errors:</p>
                      {migrationResult.errors.map((err: any, i: number) => (
                        <p key={i} className="text-xs text-error-600">
                          {err.storyKey}: {err.error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action Button */}
              <div className="mt-4">
                <Button
                  onClick={() => setShowMigrationConfirm(true)}
                  disabled={isMigrating || (migrationStatus?.remainingStories === 0)}
                  isLoading={isMigrating}
                  leftIcon={isMigrating ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                >
                  {isMigrating
                    ? 'Migrating...'
                    : migrationStatus?.remainingStories === 0
                    ? 'All Migrated'
                    : `Migrate ${Math.min(20, migrationStatus?.remainingStories || 0)} Stories`}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <CardTitle className="mb-2">What Gets Migrated?</CardTitle>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-success-500" />
                Story content in all 3 languages
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-success-500" />
                Cover image references (linked to existing assets)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-success-500" />
                Metadata (age, duration, category)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-success-500" />
                Tags and parent questions
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-success-500" />
                Read counts and favorites
              </li>
            </ul>
          </Card>

          <Card className="p-6">
            <CardTitle className="mb-2">Important Notes</CardTitle>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-warning-500 mt-0.5" />
                <span>Migration creates new books, original stories are kept</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-warning-500 mt-0.5" />
                <span>Page images use legacy asset mapping until new images are uploaded</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-warning-500 mt-0.5" />
                <span>Text is split into pages by paragraphs</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-warning-500 mt-0.5" />
                <span>Run migration in batches to avoid timeouts</span>
              </li>
            </ul>
          </Card>
        </div>

        {/* Confirm Dialog */}
        <ConfirmDialog
          isOpen={showMigrationConfirm}
          onClose={() => setShowMigrationConfirm(false)}
          onConfirm={handleMigrate}
          title="Start Migration"
          message={`This will migrate up to 20 stories to the new books format. The original stories will be kept but marked as migrated. Continue?`}
          confirmLabel="Start Migration"
          variant="primary"
        />
      </div>
    </AdminOnly>
  );
}
