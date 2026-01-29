'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { useRole } from '../../../hooks/useAuth';
import { Header } from '../../../components/layout/Header';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { SkeletonTable } from '../../../components/ui/Loading';
import { CATEGORY_ICONS } from '../../../lib/constants';
import { Plus, Edit } from 'lucide-react';

export default function CategoriesPage() {
    const { canManageCategories } = useRole();
    const categories = useQuery(api.categories.getAllCategories);

    const isLoading = categories === undefined;
    const total = categories?.length || 0;

    return (
        <div className="p-6">
            <Header
                title="Categories"
                subtitle={`Manage story categories (${total} total)`}
                breadcrumbs={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Categories' },
                ]}
                actions={
                    canManageCategories && (
                        <Link href="/dashboard/categories/new">
                            <Button leftIcon={<Plus size={18} />}>
                                New Category
                            </Button>
                        </Link>
                    )
                }
            />

            {isLoading ? (
                <SkeletonTable rows={5} />
            ) : total === 0 ? (
                <Card className="p-12 text-center text-gray-500">
                    <p>No categories found.</p>
                </Card>
            ) : (
                <Card padding="none">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Icon</th>
                                <th>Name (EN)</th>
                                <th>Name (RO)</th>
                                <th>Slug</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories!.map((category) => (
                                <tr key={category._id}>
                                    <td className="text-2xl">
                                        {CATEGORY_ICONS[category.slug] || '📚'}
                                    </td>
                                    <td className="font-medium">{category.name_en}</td>
                                    <td>{category.name_ro}</td>
                                    <td className="text-gray-500 font-mono text-sm">{category.slug}</td>
                                    <td>
                                        {canManageCategories && (
                                            <Link href={`/dashboard/categories/${category._id}`}>
                                                <Button variant="ghost" size="sm" leftIcon={<Edit size={16} />}>
                                                    Edit
                                                </Button>
                                            </Link>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}
        </div>
    );
}
