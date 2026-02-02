'use client';

import { BookOpen, Menu } from 'lucide-react';
import Link from 'next/link';

interface MobileHeaderProps {
    onMenuClick: () => void;
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
    return (
        <header className="fixed top-0 left-0 right-0 z-30 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:hidden">
            <Link href="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                    <BookOpen size={18} className="text-white" />
                </div>
                <span className="font-semibold text-gray-900">Kids Stories</span>
            </Link>
            <button
                onClick={onMenuClick}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label="Open menu"
            >
                <Menu size={24} />
            </button>
        </header>
    );
}
