import { CompetitionEventsHubView } from '@/components/admin/competition-events-hub-view';
import { requireRole } from '@/lib/auth/guards';
import {
  getAdminCompetitionPhases,
  getAdminEligibleArtists,
  getAdminShows,
} from '@/server/queries/admin';
import { getCompetitionStageOverride } from '@/server/queries/public';

export const metadata = {
  title: 'Competition & Events Hub | Admin Portal | Canadian Star',
  description: 'Manage competition timeline, event scheduling, and artist assignments.',
};

export const instant = false;

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ artistId?: string }>;
}) {
  await requireRole('admin');
  const params = await searchParams;
  const [phases, shows, artists, override] = await Promise.all([
    getAdminCompetitionPhases(),
    getAdminShows(),
    getAdminEligibleArtists(),
    getCompetitionStageOverride(),
  ]);
  return (
    <CompetitionEventsHubView
      phases={phases}
      shows={shows}
      artists={artists}
      initialOverride={override}
      initialArtistId={params.artistId}
    />
  );
}
