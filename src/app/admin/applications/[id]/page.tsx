import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/guards';
import {
  getAdminApplication,
  getAdminVotingLeaderboard,
  getAdminVotingMetrics,
} from '@/server/queries/admin';
import { getCompetitionStage } from '@/server/queries/public';
import { ApplicantReviewView } from '@/components/admin/applicant-review-view';
import { resolveMusicLinkMetadata } from '@/lib/music-metadata';

export const instant = false;

export default async function AdminApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole('admin');
  const { id } = await params;
  const [application, currentStage, votingMetrics, leaderboard] = await Promise.all([
    getAdminApplication(id),
    getCompetitionStage(),
    getAdminVotingMetrics(),
    getAdminVotingLeaderboard(),
  ]);
  if (!application) notFound();
  const musicMetadata = await resolveMusicLinkMetadata(
    Object.values(application.musicLinks ?? {}).filter(Boolean),
  );
  const leaderboardEntry = leaderboard.find((entry) => entry.id === application.artistId);
  return (
    <ApplicantReviewView
      application={{ ...application, musicMetadata }}
      currentStage={currentStage}
      votingContext={{
        totalVerifiedVotes: votingMetrics.totalVotesCast,
        rank: leaderboardEntry?.rank ?? null,
        candidateCount: leaderboard.length,
        isVotingOpen: votingMetrics.isVotingOpen,
      }}
    />
  );
}
