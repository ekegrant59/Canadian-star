'use client';

import Link from 'next/link';
import { User, PlayCircle, Calendar, CheckSquare, Send, Settings, LogOut } from 'lucide-react';

export type ApplicationStepIndex = 1 | 2 | 3 | 4 | 5;

interface ArtistSidebarProps {
  currentStep: ApplicationStepIndex;
  maxCompletedStep: number;
  onSelectStep: (step: ApplicationStepIndex) => void;
}

const SIDEBAR_ITEMS: {
  step: ApplicationStepIndex;
  label: string;
  icon: typeof User;
}[] = [
  { step: 1, label: 'Artist Info', icon: User },
  { step: 2, label: 'Media Links', icon: PlayCircle },
  { step: 3, label: 'Availability', icon: Calendar },
  { step: 4, label: 'Review', icon: CheckSquare },
  { step: 5, label: 'Submit', icon: Send },
];

export function ArtistSidebar({ currentStep, maxCompletedStep, onSelectStep }: ArtistSidebarProps) {
  const isProfileView = currentStep === 5;

  return (
    <aside className="artist-sidebar" aria-label="Application steps">
      <div>
        <span className="sidebar-season-tag">SEASON 2024</span>
        <h2 className="sidebar-app-title">Application</h2>

        <nav className="sidebar-nav-list" aria-label="Step Navigation">
          {isProfileView ? (
            <button
              type="button"
              className="sidebar-nav-item active"
              onClick={() => onSelectStep(5)}
              aria-current="step"
            >
              <User size={18} />
              <span>Artist Info</span>
            </button>
          ) : (
            SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentStep === item.step;
              const isCompleted = maxCompletedStep >= item.step;

              return (
                <button
                  key={item.step}
                  type="button"
                  className={`sidebar-nav-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                  onClick={() => onSelectStep(item.step)}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })
          )}
        </nav>
      </div>

      <div className="sidebar-footer flex flex-col gap-3">
        <Link href="/contact" className="sidebar-help-btn">
          Help Center
        </Link>
        <Link
          href="/artist"
          className="flex items-center gap-2.5 px-2 py-1 text-xs text-[#8e8b87] transition-colors hover:text-white"
        >
          <Settings size={15} />
          <span>Settings</span>
        </Link>
        <Link
          href="/login"
          className="flex items-center gap-2.5 px-2 py-1 text-xs text-[#8e8b87] transition-colors hover:text-red-400"
        >
          <LogOut size={15} />
          <span>Logout</span>
        </Link>
      </div>
    </aside>
  );
}
