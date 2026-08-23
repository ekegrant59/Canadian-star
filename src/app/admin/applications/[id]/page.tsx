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
  const currentUser = await requireRole('admin');
  const { id } = await params;
  const [application, currentStage] = await Promise.all([
    getAdminApplication(id),
    getCompetitionStage(),
  ]);
  if (!application) notFound();
  const shouldLoadVotingContext =
    currentStage === 'voting' && application.lifecycleStatus !== 'draft';
  const [musicMetadata, votingContext] = await Promise.all([
    application.lifecycleStatus === 'draft'
      ? Promise.resolve([])
      : resolveMusicLinkMetadata(Object.values(application.musicLinks ?? {}).filter(Boolean)),
    shouldLoadVotingContext
      ? Promise.all([getAdminVotingMetrics(), getAdminVotingLeaderboard()]).then(
          ([votingMetrics, leaderboard]) => {
            const entry = leaderboard.find((item) => item.id === application.artistId);
            return {
              totalVerifiedVotes: votingMetrics.totalVotesCast,
              rank: entry?.rank ?? null,
              candidateCount: leaderboard.length,
              isVotingOpen: votingMetrics.isVotingOpen,
            };
          },
        )
      : Promise.resolve({
          totalVerifiedVotes: 0,
          rank: null,
          candidateCount: 0,
          isVotingOpen: false,
        }),
  ]);
  return (
    <ApplicantReviewView
      application={{ ...application, musicMetadata }}
      currentStage={currentStage}
      votingContext={votingContext}
      isSuperAdmin={currentUser.adminAccessLevel === 'super'}
    />
  );
}
