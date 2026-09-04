'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition, useEffect, useRef } from 'react';
import {
  Bell,
  User,
  Check,
  LogOut,
  HelpCircle,
  BookOpen,
  LifeBuoy,
  Loader2,
  Pencil,
  LayoutDashboard,
} from 'lucide-react';
import { Brand } from '@/components/shared/site-header';
import { signOutAction } from '@/server/actions/auth';

interface ArtistTopBarProps {
  isDraftSaved?: boolean;
  isSaving?: boolean;
  onSaveDraft?: () => void;
  isEditing?: boolean;
  onShowDashboard?: () => void;
  accountEmail: string;
  accountName: string | null;
}

export function ArtistTopBar({
  isDraftSaved = false,
  isSaving = false,
  onSaveDraft,
  isEditing = false,
  onShowDashboard,
  accountEmail,
  accountName,
}: ArtistTopBarProps) {
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSigningOut, startSignOut] = useTransition();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const closeAllMenus = () => {
    setShowProfileMenu(false);
    setShowNotifications(false);
  };

  /**
   * Close on outside click and on Escape.
   *
   * A dropdown you can only close by clicking its own trigger is a keyboard
   * trap. Tab past it and there's no way left to dismiss it.
   */
  useEffect(() => {
    if (!showProfileMenu && !showNotifications) return;

    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeAllMenus();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAllMenus();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showProfileMenu, showNotifications]);

  const handleSignOut = () => {
    startSignOut(async () => {
      await signOutAction();
      // refresh() drops the stale session from the server components before
      // navigation lands. Skip it and the artist page renders its signed-in
      // state out of the router cache, after signing out.
      router.refresh();
      router.push('/login');
    });
  };

  return (
    <header className="artist-topbar">
      <div className="artist-topbar-left">
        <Brand />
        <nav className="artist-topbar-nav" aria-label="Portal navigation">
          <Link
            href="/artist"
            className="hover:text-primary font-semibold transition-colors"
            onClick={(event) => {
              if (onShowDashboard) {
                event.preventDefault();
                onShowDashboard();
              }
            }}
          >
            Dashboard
          </Link>
          <Link href="/rules" className="hover:text-primary transition-colors">
            Guidelines
          </Link>
          <Link href="/contact" className="hover:text-primary transition-colors">
            Support
          </Link>
        </nav>
      </div>

      <div className="artist-topbar-right" ref={containerRef}>
        {onSaveDraft && (
          <button
            type="button"
            className="artist-save-draft-btn hidden items-center gap-1.5 lg:inline-flex"
            onClick={onSaveDraft}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                <span>SAVING...</span>
              </>
            ) : isDraftSaved ? (
              <>
                <Check size={14} className="text-primary" aria-hidden="true" />
                <span>DRAFT SAVED</span>
              </>
            ) : (
              <span>SAVE DRAFT</span>
            )}
          </button>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            className="artist-icon-btn"
            aria-label="Notifications"
            aria-expanded={showNotifications}
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
          >
            <Bell size={18} aria-hidden="true" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 z-50 mt-2 w-72 rounded-xs border border-[#2a2a2a] bg-[#201f1f] p-4 shadow-2xl">
              <p className="text-text-subtle mb-2 text-xs font-bold tracking-wider uppercase">
                Notifications
              </p>
              <div className="text-text border-b border-[#2a2a2a] py-2 text-xs leading-relaxed">
                Complete your artist application before applications close.
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            type="button"
            className="artist-icon-btn border border-[#2a2a2a] bg-[#201f1f]"
            aria-label="Account menu"
            aria-expanded={showProfileMenu}
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
          >
            <User size={18} aria-hidden="true" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 z-50 mt-2 flex w-56 flex-col rounded-xs border border-[#2a2a2a] bg-[#201f1f] py-2 shadow-2xl">
              <div className="mb-1 border-b border-[#2a2a2a] px-4 py-2">
                {accountName && (
                  <span className="text-text block truncate text-xs font-bold">{accountName}</span>
                )}
                <span className="text-text-subtle block truncate text-[11px]">{accountEmail}</span>
              </div>

              {/* Portal links remain available through tablet widths. */}
              <div className="block lg:hidden">
                {isEditing ? (
                  <Link
                    href="/artist"
                    className="text-text flex min-h-11 items-center gap-2.5 px-4 py-2 text-xs transition-colors hover:bg-[#2a2a2a]"
                    onClick={(event) => {
                      closeAllMenus();
                      if (onShowDashboard) {
                        event.preventDefault();
                        onShowDashboard();
                      }
                    }}
                  >
                    <LayoutDashboard size={14} className="text-primary" aria-hidden="true" />{' '}
                    Dashboard
                  </Link>
                ) : (
                  <Link
                    href="/artist?edit=1"
                    className="text-text flex min-h-11 items-center gap-2.5 px-4 py-2 text-xs transition-colors hover:bg-[#2a2a2a]"
                    onClick={closeAllMenus}
                  >
                    <Pencil size={14} className="text-primary" aria-hidden="true" /> Edit Profile
                  </Link>
                )}
                <Link
                  href="/rules"
                  className="text-text flex min-h-11 items-center gap-2.5 px-4 py-2 text-xs transition-colors hover:bg-[#2a2a2a]"
                  onClick={closeAllMenus}
                >
                  <BookOpen size={14} className="text-primary" aria-hidden="true" /> Guidelines
                </Link>
                <Link
                  href="/contact"
                  className="text-text flex min-h-11 items-center gap-2.5 px-4 py-2 text-xs transition-colors hover:bg-[#2a2a2a]"
                  onClick={closeAllMenus}
                >
                  <LifeBuoy size={14} className="text-primary" aria-hidden="true" /> Support
                </Link>
                <div className="my-1 border-t border-[#2a2a2a]" />
              </div>

              <Link
                href="/contact"
                className="text-text flex items-center gap-2.5 px-4 py-2 text-xs transition-colors hover:bg-[#2a2a2a]"
                onClick={closeAllMenus}
              >
                <HelpCircle size={14} aria-hidden="true" /> Help
              </Link>
              <div className="my-1 border-t border-[#2a2a2a]" />
              <button
                type="button"
                className="flex items-center gap-2.5 px-4 py-2 text-left text-xs text-red-400 transition-colors hover:bg-[#2a2a2a]"
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                {isSigningOut ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                ) : (
                  <LogOut size={14} aria-hidden="true" />
                )}
                {isSigningOut ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
