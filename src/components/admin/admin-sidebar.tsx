'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Newspaper,
  Vote,
  Mail,
  X,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useSession } from '@/lib/auth/client';

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Applications', href: '/admin/applications', icon: FileText },
  { label: 'Artist reapproval', href: '/admin/reapproval', icon: ShieldCheck },
  { label: 'Competition & Events', href: '/admin/events', icon: Calendar },
  { label: 'Content', href: '/admin/content', icon: Newspaper },
  { label: 'Voting', href: '/admin/voting', icon: Vote },
  { label: 'Emails', href: '/admin/emails', icon: Mail },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const adminAccessLevel = (session?.user as { adminAccessLevel?: string } | undefined)
    ?.adminAccessLevel;
  const [counts, setCounts] = useState({ pendingApplications: 0, pendingEdits: 0 });
  useEffect(() => {
    let cancelled = false;
    const loadCounts = () => {
      fetch('/api/admin/notifications')
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (!cancelled && data)
            setCounts({
              pendingApplications: Number(data.pendingApplications ?? 0),
              pendingEdits: Number(data.pendingEdits ?? 0),
            });
        })
        .catch(() => undefined);
    };
    loadCounts();
    const timer = window.setInterval(loadCounts, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pathname]);
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => item.href !== '/admin/settings' || adminAccessLevel === 'super',
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-[#262626] bg-[#161616] text-[#e5e2e1] transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-[#262626] p-6">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-white">
              Admin Portal
            </h1>
            <p className="mt-0.5 text-xs font-medium text-[#999]">Operations Center</p>
          </div>

          {/* Mobile Close Button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-[#999] hover:bg-[#262626] hover:text-white lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="no-scrollbar flex-1 space-y-1.5 overflow-y-auto px-3 py-6">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const itemPath = item.href.split('?')[0] ?? item.href;
            const isActive =
              itemPath === '/admin' ? pathname === '/admin' : pathname.startsWith(itemPath);

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3.5 rounded-lg px-3.5 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#262626] font-semibold text-white shadow-xs'
                    : 'text-[#999999] hover:bg-[#202020] hover:text-white'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-[#FF5C00]' : 'text-[#888888]'}`} />
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span>{item.label}</span>
                  {item.href === '/admin/reapproval' && counts.pendingEdits > 0 && (
                    <span className="min-w-5 rounded-full bg-[#FF5C00] px-1.5 py-0.5 text-center text-[10px] font-black text-white">
                      {counts.pendingEdits}
                    </span>
                  )}
                  {item.href === '/admin/applications' && counts.pendingApplications > 0 && (
                    <span className="min-w-5 rounded-full bg-[#FF5C00] px-1.5 py-0.5 text-center text-[10px] font-black text-white">
                      {counts.pendingApplications}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
