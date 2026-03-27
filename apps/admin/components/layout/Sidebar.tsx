'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  FolderOpen,
  BarChart3,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  ClipboardCheck,
  Volume2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { UserRole } from '../../types';
import { useState, useEffect } from 'react';

interface SidebarProps {
  userRole: UserRole;
  userName?: string;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={20} />,
    roles: ['admin', 'editor'],
  },
  {
    href: '/dashboard/books',
    label: 'Books',
    icon: <BookOpen size={20} />,
    roles: ['admin', 'editor'],
  },
  {
    href: '/dashboard/categories',
    label: 'Categories',
    icon: <FolderOpen size={20} />,
    roles: ['admin'],
  },
  {
    href: '/dashboard/content-audit',
    label: 'Content Audit',
    icon: <ClipboardCheck size={20} />,
    roles: ['admin'],
  },
  {
    href: '/dashboard/audio',
    label: 'Audio',
    icon: <Volume2 size={20} />,
    roles: ['admin'],
  },
  {
    href: '/dashboard/statistics',
    label: 'Statistics',
    icon: <BarChart3 size={20} />,
    roles: ['admin'],
  },
  {
    href: '/dashboard/users',
    label: 'Users',
    icon: <Users size={20} />,
    roles: ['admin'],
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    icon: <Settings size={20} />,
    roles: ['admin'],
  },
];

export function Sidebar({ userRole, userName, onLogout, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole));

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  // Close sidebar when route changes (mobile)
  useEffect(() => {
    if (onClose) {
      onClose();
    }
  }, [pathname]);

  const handleNavClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen bg-white border-r border-gray-200 transition-all duration-300',
          // Desktop: always visible
          'md:translate-x-0',
          collapsed ? 'md:w-20' : 'md:w-64',
          // Mobile: slide in/out
          'w-64',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors md:hidden"
          >
            <X size={20} />
          </button>

          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2" onClick={handleNavClick}>
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <BookOpen size={18} className="text-white" />
              </div>
              <span className="font-semibold text-gray-900">Kids Stories</span>
            </Link>
          )}
          {collapsed && (
            <Link href="/dashboard" className="mx-auto" onClick={handleNavClick}>
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <BookOpen size={18} className="text-white" />
              </div>
            </Link>
          )}

          {/* Desktop collapse button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors hidden md:block',
              collapsed && 'mx-auto mt-2'
            )}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {filteredNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={cn(
                'nav-item min-h-[44px]', // Touch-friendly height
                isActive(item.href) && 'nav-item-active',
                collapsed && 'justify-center px-2 md:justify-center'
              )}
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          {!collapsed && userName && (
            <div className="mb-3 px-2">
              <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
              <p className="text-xs text-gray-500 capitalize">{userRole}</p>
            </div>
          )}
          <button
            onClick={() => {
              onLogout();
              if (onClose) onClose();
            }}
            className={cn(
              'nav-item w-full min-h-[44px] text-error-600 hover:text-error-700 hover:bg-error-50',
              collapsed && 'justify-center px-2'
            )}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut size={20} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
