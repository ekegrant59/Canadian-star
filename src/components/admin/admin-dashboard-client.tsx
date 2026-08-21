'use client';

import Link from 'next/link';
import { CalendarClock, Settings2 } from 'lucide-react';
import { COMPETITION_STAGES, type CompetitionStage } from '@/config/event';
import type { AdminApplicationRecord } from '@/server/queries/admin';
import { ApplicationsDashboard } from './stages/applications-dashboard';
import { VotingDashboard } from './stages/voting-dashboard';
import { AnticipationDashboard } from './stages/anticipation-dashboard';
import { FinalistsDashboard } from './stages/finalists-dashboard';

type Phase = {
  id: string;
  key: CompetitionStage;
  label: string;
  startsAt: Date;
  endsAt: Date;
  displayOrder: number;
};

type Show = {
  id: string;
  label: string;
  showDate: string;
  status: 'scheduled' | 'postponed' | 'completed' | 'cancelled';
};

type Props = {
  currentStage: CompetitionStage;
  applications: AdminApplicationRecord[];
  stats: { total: number; pending: number; approved: number; rejected: number };
  phases: Phase[];
  shows: Show[];
  votingMetrics: {
    totalVotesCast: number;
    totalAttempts: number;
    verifiedVoters: number;
    flaggedVotes: number;
    invalidatedVotes: number;
  };
};

export function AdminDashboardClient({
  currentStage,
  applications,
  stats,
  phases,
  shows,
  votingMetrics,
}: Props) {
  const activePhase = phases.find((phase) => phase.key === currentStage);
  const nextShow = shows
    .filter((show) => show.status === 'scheduled' || show.status === 'postponed')
    .sort((a, b) => a.showDate.localeCompare(b.showDate))[0];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-gray-500 uppercase">
            <CalendarClock className="h-4 w-4 text-[#FF5C00]" />
            Live Competition Phase
          </div>
          <p className="mt-2 text-lg font-extrabold text-gray-900">
            {COMPETITION_STAGES.find((stage) => stage.key === currentStage)?.label}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {activePhase
              ? `${formatDate(activePhase.startsAt)} to ${formatDate(activePhase.endsAt)}`
              : 'No scheduled window is available for this phase.'}
            {nextShow ? ` · Next show: ${nextShow.label} on ${formatDate(nextShow.showDate)}` : ''}
          </p>
        </div>
        <Link
          href="/admin/events"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
        >
          <Settings2 className="h-4 w-4" />
          MANAGE TIMELINE
        </Link>
      </section>

      {currentStage === 'applications' && (
        <ApplicationsDashboard
          applications={applications}
          stats={stats}
          phases={phases}
          shows={shows}
        />
      )}
      {currentStage === 'voting' && (
        <VotingDashboard applications={applications} metrics={votingMetrics} />
      )}
      {currentStage === 'anticipation' && <AnticipationDashboard applications={applications} />}
      {currentStage === 'finalists' && <FinalistsDashboard applications={applications} />}
    </div>
  );
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(new Date(value));
}
