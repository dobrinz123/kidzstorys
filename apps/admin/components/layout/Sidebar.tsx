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
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { UserRole } from '../../types';
import { useState } from 'react';

interface SidebarProps {
  userRole: UserRole;
  userName?: string;
  onLogout: () => void;
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

export function Sidebar({ userRole, userName, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole));

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-300',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <BookOpen size={18} className="text-white" />
            </div>
            <span className="font-semibold text-gray-900">Kids Stories</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="mx-auto">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <BookOpen size={18} className="text-white" />
            </div>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors',
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
            className={cn(
              'nav-item',
              isActive(item.href) && 'nav-item-active',
              collapsed && 'justify-center px-2'
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
          onClick={onLogout}
          className={cn(
            'nav-item w-full text-error-600 hover:text-error-700 hover:bg-error-50',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={20} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
