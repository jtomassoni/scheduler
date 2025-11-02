'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  currentLabel?: string;
}

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/company-requests': 'Leads & Companies',
  '/venues': 'Venues',
  '/shifts': 'Shift Scheduler',
  '/scheduling-priority': 'Scheduling Priority',
  '/reports': 'Reports',
  '/overrides': 'Override Requests',
  '/users': 'User Management',
  '/admin/app-health': 'App Health',
  '/admin/system-reports': 'System Reports',
  '/availability': 'Availability Calendar',
  '/profile': 'User Profile',
  '/notifications': 'Notifications',
};

export function Breadcrumb({ items, currentLabel }: BreadcrumbProps) {
  const pathname = usePathname();

  // Get current page label
  const currentPageLabel =
    currentLabel ||
    routeLabels[pathname] ||
    pathname.split('/').pop()?.replace(/-/g, ' ') ||
    'Page';

  // Auto-generate breadcrumbs if not provided
  let breadcrumbItems: BreadcrumbItem[] = items || [];

  // If no items provided, only add Dashboard link if we're not already on the dashboard
  if (!items && pathname !== '/dashboard') {
    breadcrumbItems = [{ label: 'Dashboard', href: '/dashboard' }];
  }

  // Auto-generate breadcrumbs for admin routes
  if (!items && pathname.startsWith('/admin') && pathname !== '/dashboard') {
    breadcrumbItems = [{ label: 'Dashboard', href: '/dashboard' }];
  }

  // If we're on the dashboard and no items provided, just show the label without breadcrumb items
  if (pathname === '/dashboard' && breadcrumbItems.length === 0) {
    return (
      <nav className="flex items-center gap-2 text-sm mb-4">
        <span className="text-gray-700 dark:text-gray-200 font-medium">
          {currentPageLabel}
        </span>
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-2 text-sm mb-4">
      {breadcrumbItems.map((item, index) => (
        <span key={item.href} className="flex items-center gap-2">
          {index > 0 && (
            <svg
              className="w-4 h-4 text-gray-500 dark:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          )}
          <Link
            href={item.href}
            className="text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          >
            {item.label}
          </Link>
        </span>
      ))}
      {breadcrumbItems.length > 0 && (
        <>
          <svg
            className="w-4 h-4 text-gray-500 dark:text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span className="text-gray-700 dark:text-gray-200 font-medium">
            {currentPageLabel}
          </span>
        </>
      )}
    </nav>
  );
}
