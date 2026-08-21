import type { Metadata } from 'next';
import { connection } from 'next/server';
import { LandingPage } from '@/components/marketing/landing-page';
import {
  getActiveHomepageAnnouncement,
  getCompetitionPhases,
  getCompetitionStage,
  getConfirmedJudges,
  getConfirmedSponsors,
  getPublicFinalists,
  getPublicGrandFinalists,
  getPublicVotingArtists,
  getFeatureFlag,
  getShows,
} from '@/server/queries/public';
import type { FinalistArtist, VotingArtist } from '@/types/landing';
import type { CompetitionStage } from '@/config/event';
import { getVotingClosingSoonWindow, isWithinWindow } from '@/lib/competition/timeline';

export const metadata: Metadata = {
  title: 'The Next Great Canadian Country Star',
  description:
    'Ontario emerging country artists compete for the crown across four qualifying shows and one grand final.',
};

export const instant = false;

export default async function HomePage() {
  await connection();
  const [
    stage,
    votingRows,
    finalistRows,
    grandFinalRows,
    showRows,
    phases,
    announcement,
    judgeRows,
    sponsorRows,
    votingFlag,
  ] = await Promise.all([
    getCompetitionStage(),
    getPublicVotingArtists(),
    getPublicFinalists(),
    getPublicGrandFinalists(),
    getShows(),
    getCompetitionPhases(),
    getActiveHomepageAnnouncement(),
    getConfirmedJudges(),
    getConfirmedSponsors(),
    getFeatureFlag('VOTING_OPEN'),
  ]);
  const activePhase = phases.find((phase) => phase.key === stage);
  const votingPhase = phases.find((phase) => phase.key === 'voting');
  const closingSoonWindow = votingPhase ? getVotingClosingSoonWindow(votingPhase) : null;
  const votingClosingSoon =
    stage === 'voting' && closingSoonWindow ? isWithinWindow(new Date(), closingSoonWindow) : false;
  const heroPhase = votingClosingSoon ? votingPhase : activePhase;

  const votingArtists: VotingArtist[] = votingRows.map((artist, index) => ({
    id: artist.id,
    name: artist.actName,
    slug: artist.slug,
    hometown:
      [artist.locationCity, artist.locationProvince].filter(Boolean).join(', ') || 'Ontario',
    genre: artist.actType === 'band' ? 'Country band' : 'Country artist',
    actType: artist.actType,
    photoUrl: publicPhotoUrl(artist.primaryPhotoKey, index),
    bioSnippet: artist.bio ?? undefined,
  }));

  const publicFinalistRows = grandFinalRows.length === 4 ? grandFinalRows : finalistRows;
  const grandFinal = grandFinalRows.length === 4;
  const finalists: FinalistArtist[] = publicFinalistRows.flatMap((artist) => {
    if (grandFinal)
      return [
        {
          id: artist.id,
          name: artist.actName,
          slug: artist.slug,
          hometown:
            [artist.locationCity, artist.locationProvince].filter(Boolean).join(', ') || 'Ontario',
          genre: artist.actType === 'band' ? 'Country band' : 'Country artist',
          actType: artist.actType,
          photoUrl: publicPhotoUrl(artist.primaryPhotoKey, artist.performanceOrder ?? 1),
          bioSnippet: artist.bio ?? undefined,
          showNumber: Math.min(4, Math.max(1, artist.performanceOrder ?? 1)) as 1 | 2 | 3 | 4,
          showTitle: artist.showLabel,
          showDate: artist.showDate,
          ticketUrl: artist.ticketUrl ?? '#schedule',
        },
      ];
    const match = artist.showLabel.match(/(\d+)/);
    const showNumber = Number(match?.[1] ?? 0);
    if (showNumber < 1 || showNumber > 4) return [];
    return [
      {
        id: artist.id,
        name: artist.actName,
        slug: artist.slug,
        hometown:
          [artist.locationCity, artist.locationProvince].filter(Boolean).join(', ') || 'Ontario',
        genre: artist.actType === 'band' ? 'Country band' : 'Country artist',
        actType: artist.actType,
        photoUrl: publicPhotoUrl(artist.primaryPhotoKey, showNumber),
        bioSnippet: artist.bio ?? undefined,
        showNumber: showNumber as 1 | 2 | 3 | 4,
        showTitle: artist.showLabel,
        showDate: artist.showDate,
        ticketUrl: artist.ticketUrl ?? '#schedule',
      },
    ];
  });

  const schedule = showRows.map((show, index) => ({
    n: String(index + 1).padStart(2, '0'),
    subtitle: show.label.toUpperCase(),
    date: new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
      .format(new Date(`${show.showDate}T12:00:00`))
      .toUpperCase(),
    copy:
      show.type === 'final'
        ? 'The four qualifying winners battle for the title.'
        : 'Four artists compete for a place in the Grand Final.',
    final: show.type === 'final',
    btn: show.type === 'final' ? 'VIP TICKETS' : 'TICKETS',
    ticketUrl: show.ticketUrl,
    venueName: show.venueName,
    venueAddress: show.venueAddress,
  }));
  const finalistShows = showRows
    .filter((show) => show.type === 'qualifier')
    .map((show, index) => ({
      showNumber: (index + 1) as 1 | 2 | 3 | 4,
      title: show.label,
      date: show.showDate,
      venueName: show.venueName,
      venueAddress: show.venueAddress,
    }));

  return (
    <LandingPage
      // "Voting closes soon" uses the anticipation countdown presentation, but
      // it remains operationally inside Fan Voting until the voting deadline.
      stage={votingClosingSoon ? 'anticipation' : stage}
      schedule={schedule}
      announcement={announcement}
      judges={judgeRows.map((judge) => ({
        id: judge.id,
        name: judge.name,
        role: judge.title ?? judge.organization ?? 'Competition judge',
        bio: judge.bio ?? '',
        imageUrl: publicMediaUrl(judge.photoKey),
      }))}
      sponsors={sponsorRows.map((sponsor) => ({
        id: sponsor.id,
        name: sponsor.name,
        websiteUrl: sponsor.websiteUrl,
        logoUrl: publicMediaUrl(sponsor.logoKey),
      }))}
      viewModelOverride={{
        votingArtists,
        finalists,
        finalistShows,
        grandFinal,
        votingOpen: stage === 'voting' && votingFlag,
        datePillText: heroPhase
          ? formatPhaseWindow(heroPhase.label, heroPhase.startsAt, heroPhase.endsAt)
          : undefined,
        countdown: heroPhase
          ? {
              targetDate: heroPhase.endsAt.toISOString(),
              label: getPhaseDeadlineLabel(stage, votingClosingSoon),
              subLabel: formatPhaseDeadline(heroPhase.endsAt),
              isUrgent: votingClosingSoon,
            }
          : undefined,
      }}
    />
  );
}

const heroDateFormatter = new Intl.DateTimeFormat('en-CA', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'America/Toronto',
});

const heroDeadlineFormatter = new Intl.DateTimeFormat('en-CA', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
  timeZone: 'America/Toronto',
});

function formatPhaseWindow(label: string, startsAt: Date, endsAt: Date) {
  return `${label.toUpperCase()} • ${heroDateFormatter.format(startsAt).toUpperCase()} – ${heroDateFormatter.format(endsAt).toUpperCase()}`;
}

function formatPhaseDeadline(endsAt: Date) {
  return heroDeadlineFormatter.format(endsAt);
}

function getPhaseDeadlineLabel(stage: CompetitionStage, votingClosingSoon: boolean) {
  if (votingClosingSoon) return 'VOTING CLOSES SOON';
  if (stage === 'applications') return 'APPLICATIONS CLOSE';
  if (stage === 'voting') return 'VOTING CLOSES';
  return 'PHASE ENDS';
}

function publicMediaUrl(key: string | null) {
  if (!key) return null;
  if (key.startsWith('http://') || key.startsWith('https://') || key.startsWith('/')) return key;
  return process.env.CLOUDINARY_CLOUD_NAME
    ? `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/c_fill,g_auto,w_800,h_600,q_auto,f_auto/${key}`
    : null;
}

function publicPhotoUrl(key: string | null, fallbackIndex: number) {
  if (key && process.env.CLOUDINARY_CLOUD_NAME) {
    return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/c_fill,g_auto,w_800,h_600,q_auto,f_auto/${key}`;
  }
  void fallbackIndex;
  return '/images/artist-profile-hero.jpg';
}
