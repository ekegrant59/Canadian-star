'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu, Bell, HelpCircle, ExternalLink, LogOut } from 'lucide-react';
import { signOutAction } from '@/server/actions/auth';
import { ProfileImage } from '@/components/shared/profile-image';

interface AdminHeaderProps {
  onMenuToggle?: () => void;
}

export function AdminHeader({ onMenuToggle }: AdminHeaderProps) {
  const router = useRouter();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSigningOut, startSignOut] = useTransition();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5 shadow-2xs">
      {/* Left: Mobile Menu Trigger & Title */}
      <div className="flex items-center gap-4">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Center/Right: Phase Switcher & Action Icons */}
      <div className="flex items-center gap-3 sm:gap-5">
        {/* View Public Site Link */}
        <Link
          href="/"
          target="_blank"
          className="hidden items-center gap-1 text-xs font-medium text-gray-600 transition-colors hover:text-gray-900 md:flex"
        >
          <span>View Public Site</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>

        {/* Notifications Icon */}
        <button
          type="button"
          className="relative rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          aria-label="View notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#FF5C00]" />
        </button>

        {/* Help Icon */}
        <button
          type="button"
          className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          aria-label="Help and documentation"
        >
          <HelpCircle className="h-4 w-4" />
        </button>

        {/* User Profile Avatar & Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 rounded-full p-0.5 transition-all hover:ring-2 hover:ring-[#FF5C00]/40"
            aria-label="User account menu"
            aria-expanded={isUserMenuOpen}
          >
            <ProfileImage
              alt="Admin User"
              className="h-8 w-8 rounded-full border border-gray-200"
            />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-gray-200 bg-white py-2 shadow-xl">
              <div className="border-b border-gray-100 px-4 py-2">
                <p className="text-xs font-bold text-gray-900">Administrator</p>
                <p className="text-[11px] text-gray-500">Competition operations</p>
              </div>

              <button
                type="button"
                onClick={() =>
                  startSignOut(async () => {
                    await signOutAction();
                    router.refresh();
                    router.push('/admin/login');
                  })
                }
                disabled={isSigningOut}
                className="mt-1 flex items-center gap-2.5 border-t border-gray-100 px-4 py-2 text-xs text-red-600 transition-colors hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 text-red-600" />
                <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
