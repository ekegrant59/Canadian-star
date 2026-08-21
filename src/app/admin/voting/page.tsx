import { Suspense } from 'react';
import { VotingOverviewMonitor } from '@/components/admin/voting/voting-overview-monitor';
import { requireRole } from '@/lib/auth/guards';
import {
  getAdminVoteActivity,
  getAdminVotingLeaderboard,
  getAdminVotingMetrics,
} from '@/server/queries/admin';

export const instant = false;

interface VotingPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function AdminVotingPage({ searchParams }: VotingPageProps) {
  await requireRole('admin');
  const params = await searchParams;
  const initialTab = params.tab === 'leaderboard' ? 'leaderboard' : 'live';
  const [metrics, activity, leaderboard] = await Promise.all([
    getAdminVotingMetrics(),
    getAdminVoteActivity(),
    getAdminVotingLeaderboard(),
  ]);

  return (
    <Suspense
      fallback={<div className="p-8 text-center text-[#6B7280]">Loading voting overview...</div>}
    >
      <VotingOverviewMonitor
        initialTab={initialTab}
        metrics={metrics}
        activity={activity}
        leaderboard={leaderboard}
      />
    </Suspense>
  );
}
