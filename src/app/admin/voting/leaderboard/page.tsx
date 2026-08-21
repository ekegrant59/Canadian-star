import { ArtistLeaderboardView } from '@/components/admin/voting/artist-leaderboard-view';
import { requireRole } from '@/lib/auth/guards';
import { getAdminVotingLeaderboard, getAdminVotingMetrics } from '@/server/queries/admin';

export const instant = false;

export default async function AdminVotingLeaderboardPage() {
  await requireRole('admin');
  const [leaderboard, metrics] = await Promise.all([
    getAdminVotingLeaderboard(),
    getAdminVotingMetrics(),
  ]);
  return <ArtistLeaderboardView artists={leaderboard} metrics={metrics} />;
}
