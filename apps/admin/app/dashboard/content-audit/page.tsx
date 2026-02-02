'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { useRole, useAuthStore } from '../../../hooks/useAuth';
import { Header } from '../../../components/layout/Header';
import { AdminOnly } from '../../../components/layout/RoleGuard';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Spinner } from '../../../components/ui/Loading';
import { Button } from '../../../components/ui/Button';
import { useState } from 'react';
import {
    CheckCircle,
    AlertTriangle,
    XCircle,
    Book,
    Image,
    FileText,
    RefreshCw,
    ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

export default function ContentAuditPage() {
    const { role } = useRole();
    const auditResult = useQuery(api.books.validateAllBooksContent);

    const isLoading = auditResult === undefined;

    const getProblemIcon = (problem: string) => {
        if (problem.includes('image')) return <Image size={14} className="text-error-500" />;
        if (problem.includes('text')) return <FileText size={14} className="text-warning-500" />;
        return <AlertTriangle size={14} className="text-warning-500" />;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published': return 'success';
            case 'ready': return 'warning';
            case 'draft': return 'default';
            default: return 'default';
        }
    };

    return (
        <AdminOnly currentRole={role}>
            <div className="p-6">
                <Header
                    title="Content Audit"
                    subtitle="Verify that all books have complete content in all languages"
                    breadcrumbs={[
                        { label: 'Dashboard', href: '/dashboard' },
                        { label: 'Content Audit' },
                    ]}
                />

                {/* Summary Cards */}
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Spinner size="lg" />
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <Card className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                                        <Book size={24} className="text-primary-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900">{auditResult.totalBooks}</p>
                                        <p className="text-sm text-gray-500">Total Books</p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-success-100 flex items-center justify-center">
                                        <CheckCircle size={24} className="text-success-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-success-600">{auditResult.booksOk}</p>
                                        <p className="text-sm text-gray-500">Books OK</p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-error-100 flex items-center justify-center">
                                        <XCircle size={24} className="text-error-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-error-600">{auditResult.booksWithIssues}</p>
                                        <p className="text-sm text-gray-500">Books with Issues</p>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Issues List */}
                        {auditResult.booksWithIssues === 0 ? (
                            <Card className="p-8 text-center">
                                <CheckCircle size={48} className="mx-auto text-success-500 mb-4" />
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">All Books are Complete!</h3>
                                <p className="text-gray-500">
                                    All {auditResult.totalBooks} books have complete content in all three languages.
                                </p>
                            </Card>
                        ) : (
                            <Card padding="none">
                                <div className="p-4 border-b border-gray-200">
                                    <h3 className="font-semibold text-gray-900">Books Requiring Attention</h3>
                                    <p className="text-sm text-gray-500">
                                        {auditResult.booksWithIssues} books have missing or inconsistent content
                                    </p>
                                </div>

                                <div className="divide-y divide-gray-100">
                                    {auditResult.issues.map((issue) => (
                                        <div key={issue.bookKey} className="p-4 hover:bg-gray-50">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Link
                                                            href={`/dashboard/books/${issue.bookId}`}
                                                            className="font-medium text-gray-900 hover:text-primary-600 flex items-center gap-1"
                                                        >
                                                            {issue.title}
                                                            <ExternalLink size={14} />
                                                        </Link>
                                                        <Badge
                                                            variant={getStatusColor(issue.status) as any}
                                                            size="sm"
                                                        >
                                                            {issue.status}
                                                        </Badge>
                                                        <span className="text-xs text-gray-400">
                                                            {issue.pageCount} pages
                                                        </span>
                                                    </div>

                                                    <div className="text-xs text-gray-500 mb-2">
                                                        Key: {issue.bookKey}
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        {issue.problems.map((problem, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700"
                                                            >
                                                                {getProblemIcon(problem)}
                                                                {problem}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-error-100 text-error-600 font-bold text-sm">
                                                        {issue.problems.length}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </AdminOnly>
    );
}
