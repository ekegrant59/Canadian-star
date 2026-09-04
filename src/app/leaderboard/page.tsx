import type { Metadata } from 'next';
import { connection } from 'next/server';
import { SiteHeader, SiteFooter } from '@/components/shared/site-header';
import { TournamentLeaderboardView } from '@/components/marketing/leaderboard/tournament-leaderboard-view';
import { getPublicTournamentLeaderboard } from '@/server/queries/public';
import type {
  TournamentStateData,
  TournamentContender,
  TournamentShow,
  ShowStatus,
} from '@/data/tournament-leaderboard';
import { isScheduledShowLive } from '@/lib/competition/show-status';

export const metadata: Metadata = {
  title: 'Tournament Leaderboard | The Next Great Canadian Country Star',
  description:
    'Follow the five-night qualifying battles and Grand Finale tournament leaderboard. Real-time stage results, winners, and final 16 contenders.',
};

export const instant = false;

export default async function LeaderboardPage() {
  await connection();
  const rows = await getPublicTournamentLeaderboard();
  const qualifiers = rows
    .filter((show) => show.type === 'qualifier')
    .sort((a, b) => a.showDate.localeCompare(b.showDate));
  const finale = rows.find((show) => show.type === 'final');
  const toArtist = (
    artist: (typeof rows)[number]['assignedArtists'][number],
    status: TournamentContender['status'],
  ): TournamentContender => ({
    id: artist.id,
    name: artist.actName,
    slug: artist.slug,
    photoUrl:
      artist.primaryPhotoKey && process.env.CLOUDINARY_CLOUD_NAME
        ? `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/c_fill,g_auto,w_800,h_800,q_auto,f_auto/${artist.primaryPhotoKey}`
        : '',
    hometown:
      [artist.locationCity, artist.locationProvince].filter(Boolean).join(', ') || 'Ontario',
    genre: artist.actType === 'band' ? 'Country band' : 'Country artist',
    status,
    verified: true,
  });
  const shows: TournamentShow[] = qualifiers.map((show, index) => {
    const winner = show.assignedArtists.find((artist) => artist.advancedAt);
    const status: ShowStatus =
      show.status === 'completed' ? 'completed' : isScheduledShowLive(show) ? 'live' : 'upcoming';
    return {
      id: show.id,
      showNumber: index + 1,
      title: show.label,
      city: show.label.split('•').pop()?.trim() ?? show.label,
      venue: show.venueName ?? 'Venue TBD',
      dateText: new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(
        new Date(`${show.showDate}T12:00:00`),
      ),
      status,
      statusLabel:
        status === 'live'
          ? 'LIVE NOW'
          : status === 'completed'
            ? winner
              ? 'COMPLETED'
              : 'RESULT PENDING'
            : 'UPCOMING',
      winner: winner ? toArtist(winner, 'winner') : null,
      contenders: show.assignedArtists.map((artist) =>
        toArtist(
          artist,
          artist.advancedAt
            ? 'winner'
            : status === 'completed'
              ? winner
                ? 'eliminated'
                : 'pending'
              : status === 'live'
                ? 'competing'
                : 'scheduled',
        ),
      ),
      ticketUrl: show.ticketUrl ?? '#schedule',
    };
  });
  while (shows.length < 4) {
    const index = shows.length + 1;
    shows.push({
      id: `pending-${index}`,
      showNumber: index,
      title: `SHOW ${index}`,
      city: 'TBD',
      venue: 'Venue TBD',
      dateText: 'DATE TBD',
      status: 'pending',
      statusLabel: 'AWAITING LINEUP',
      winner: null,
      contenders: [],
      ticketUrl: '#schedule',
    });
  }
  const finalWinner = finale?.assignedArtists.find((artist) => artist.winnerAt);
  const data: TournamentStateData = {
    phaseKey: 'live',
    phaseLabel: 'Live tournament',
    phaseDescription: 'Follow the Final 16 through the qualifying shows and Grand Finale.',
    kicker: 'THE COMPETITION',
    headline: 'FIVE NIGHTS. ONE WINNER.',
    subhead: 'Track the Final 16 as each live show sends one champion to the Grand Finale.',
    shows,
    grandFinale: {
      id: finale?.id ?? 'finale',
      title: finale?.label ?? 'GRAND FINALE',
      headline: finalWinner ? 'CHAMPION CROWNED' : 'AWAITING CHAMPIONS',
      dateText: finale?.showDate
        ? new Intl.DateTimeFormat('en-CA', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }).format(new Date(`${finale.showDate}T12:00:00`))
        : 'DATE TBD',
      venue: finale?.venueName ?? 'Venue TBD',
      status: finalWinner ? 'completed' : 'upcoming',
      statusLabel: finalWinner ? 'CHAMPION CROWNED' : 'AWAITING CHAMPIONS',
      finalists: [0, 1, 2, 3].map((index) => {
        const artist = finale?.assignedArtists[index];
        return artist ? toArtist(artist, 'competing') : null;
      }),
      winner: finalWinner ? toArtist(finalWinner, 'winner') : null,
    },
  };
  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a]">
      {/* Universal Site Navbar with active Leaderboard indicator */}
      <SiteHeader activeNav="leaderboard" />

      {/* Main Content: Tournament Leaderboard Bracket (No sponsors, no prizes) */}
      <main className="flex-1">
        <TournamentLeaderboardView initialData={data} />
      </main>

      {/* Universal Site Footer */}
      <SiteFooter />
    </div>
  );
}
