import 'server-only';

import { and, asc, count, desc, eq, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  artists,
  applications,
  competitionPhases,
  emailConsents,
  showArtists,
  shows,
  users,
  votes,
  subscribers,
} from '@/db/schema';
import { getCompetitionStage, getFeatureFlag } from './public';
import { parseFraudSignals } from '@/lib/voting/fraud';
import type { ArtistRecipient } from '@/lib/email/types';

export type AdminApplicationStatus = 'pending' | 'approved' | 'rejected';

export type AdminApplicationRecord = {
  id: string;
  artistId: string;
  applicationNumber: string;
  fullName: string;
  stageName: string;
  actType: 'solo' | 'duo' | 'band';
  discipline: string;
  location: string;
  email: string;
  phone: string;
  formationYear?: number | null;
  memberCount?: number | null;
  bio: string;
  submissionDate: string;
  status: AdminApplicationStatus;
  lifecycleStatus: (typeof applications.status.enumValues)[number];
  rejectionReason?: string;
  avatarUrl: string | null;
  coverPhotoUrl: string | null;
  audioTracks: Array<{ title: string; duration: string; url?: string }>;
  videoUrl?: string;
  videoUrls: string[];
  videoThumbnailUrl?: string;
  availability: { allRequiredDates: boolean; grandFinale: boolean };
  socialLinks: Record<string, string>;
  musicLinks: Record<string, string>;
  musicMetadata?: Array<{
    url: string;
    title: string;
    subtitle: string | null;
    image: string | null;
  }>;
  reviewNotes?: string;
  reviewedBy?: string;
  profileStatus: 'hidden' | 'published' | 'archived';
  submittedAt: Date | null;
  verifiedVotes: number;
  pendingVotes: number;
  flaggedVotes: number;
  invalidatedVotes: number;
  qualifyingShow?: {
    id: string;
    label: string;
    showDate: string;
    startTime: string | null;
    venueName: string | null;
    venueAddress: string | null;
  };
};

function safeMediaUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  return cloud
    ? `https://res.cloudinary.com/${cloud}/image/upload/c_fill,g_auto,w_800,h_600,q_auto,f_auto/${key}`
    : null;
}

function lifecycleLabel(status: AdminApplicationRecord['lifecycleStatus']): AdminApplicationStatus {
  if (status === 'rejected' || status === 'withdrawn') return 'rejected';
  if (status === 'approved' || status === 'shortlisted' || status === 'finalist') return 'approved';
  return 'pending';
}

function formatDate(value: Date | null): string {
  if (!value) return 'Draft';
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(value);
}

function mapRow(
  row: {
    id: string;
    artistId: string;
    status: (typeof applications.status.enumValues)[number];
    submittedAt: Date | null;
    availableAllDates: boolean | null;
    rejectionReason: string | null;
    reviewNotes: string | null;
    reviewedBy: string | null;
    profileStatus: 'hidden' | 'published' | 'archived';
    actName: string;
    actType: 'solo' | 'duo' | 'band';
    bio: string | null;
    locationCity: string | null;
    locationProvince: string | null;
    formationYear: number | null;
    memberCount: number | null;
    contactEmail: string | null;
    contactPhone: string | null;
    photoKeys: string[];
    primaryPhotoKey: string | null;
    performanceVideoUrl: string | null;
    performanceVideoUrls: string[];
    socialLinks: Record<string, string>;
    musicLinks: Record<string, string>;
    userName: string | null;
  },
  voteStats: {
    verifiedVotes: number;
    pendingVotes: number;
    flaggedVotes: number;
    invalidatedVotes: number;
  } = { verifiedVotes: 0, pendingVotes: 0, flaggedVotes: 0, invalidatedVotes: 0 },
): AdminApplicationRecord {
  const videoUrls = row.performanceVideoUrls?.length
    ? row.performanceVideoUrls
    : row.performanceVideoUrl
      ? [row.performanceVideoUrl]
      : [];
  const musicEntries = Object.entries(row.musicLinks ?? {}).filter(([, url]) => Boolean(url));
  return {
    id: row.id,
    artistId: row.artistId,
    applicationNumber: `APP-${row.id.slice(0, 8).toUpperCase()}`,
    fullName: row.userName || row.actName,
    stageName: row.actName,
    actType: row.actType,
    discipline: row.actType === 'band' ? 'Country band' : 'Country artist',
    location: [row.locationCity, row.locationProvince].filter(Boolean).join(', ') || 'Ontario',
    email: row.contactEmail || '',
    phone: row.contactPhone || '',
    formationYear: row.formationYear,
    memberCount: row.memberCount,
    bio: row.bio || 'No biography provided.',
    submissionDate: formatDate(row.submittedAt),
    status: lifecycleLabel(row.status),
    lifecycleStatus: row.status,
    rejectionReason: row.rejectionReason ?? undefined,
    avatarUrl: safeMediaUrl(row.primaryPhotoKey || row.photoKeys?.[0]),
    coverPhotoUrl: safeMediaUrl(row.primaryPhotoKey || row.photoKeys?.[0]),
    audioTracks: musicEntries.map(([key, url]) => ({
      title: key.replace(/^link_\d+$/, 'Recorded music'),
      duration: 'External link',
      url,
    })),
    videoUrl: videoUrls[0],
    videoUrls,
    videoThumbnailUrl: safeMediaUrl(row.primaryPhotoKey || row.photoKeys?.[0]) ?? undefined,
    availability: {
      allRequiredDates: Boolean(row.availableAllDates),
      grandFinale: Boolean(row.availableAllDates),
    },
    socialLinks: row.socialLinks ?? {},
    musicLinks: row.musicLinks ?? {},
    reviewNotes: row.reviewNotes ?? undefined,
    reviewedBy: row.reviewedBy ?? undefined,
    profileStatus: row.profileStatus,
    submittedAt: row.submittedAt,
    ...voteStats,
  };
}

const adminApplicationColumns = {
  id: applications.id,
  artistId: artists.id,
  status: applications.status,
  submittedAt: applications.submittedAt,
  availableAllDates: applications.availableAllDates,
  rejectionReason: applications.rejectionReason,
  reviewNotes: applications.reviewNotes,
  reviewedBy: applications.reviewedBy,
  profileStatus: artists.profileStatus,
  actName: artists.actName,
  actType: artists.actType,
  bio: artists.bio,
  locationCity: artists.locationCity,
  locationProvince: artists.locationProvince,
  formationYear: artists.formationYear,
  memberCount: artists.memberCount,
  contactEmail: artists.contactEmail,
  contactPhone: artists.contactPhone,
  photoKeys: artists.photoKeys,
  primaryPhotoKey: artists.primaryPhotoKey,
  performanceVideoUrl: artists.performanceVideoUrl,
  performanceVideoUrls: artists.performanceVideoUrls,
  socialLinks: artists.socialLinks,
  musicLinks: artists.musicLinks,
  userName: users.name,
};

export async function getAdminApplications(): Promise<AdminApplicationRecord[]> {
  const rows = await db
    .select(adminApplicationColumns)
    .from(applications)
    .innerJoin(artists, eq(artists.id, applications.artistId))
    .innerJoin(users, eq(users.id, artists.userId))
    .orderBy(desc(applications.submittedAt), asc(artists.actName));
  const counts = await getApplicationVoteStats(rows.map((row) => row.artistId));
  const records = rows.map((row) => mapRow(row, counts.get(row.artistId)));
  const assignments = await getQualifierAssignments(rows.map((row) => row.artistId));
  return records.map((record) => ({ ...record, qualifyingShow: assignments.get(record.artistId) }));
}

export async function getAdminEmailRecipients() {
  const rows = await db
    .select({
      id: artists.id,
      name: users.name,
      actName: artists.actName,
      email: artists.contactEmail,
      status: applications.status,
      showKey: shows.key,
    })
    .from(artists)
    .innerJoin(applications, eq(applications.artistId, artists.id))
    .innerJoin(users, eq(users.id, artists.userId))
    .leftJoin(showArtists, eq(showArtists.artistId, artists.id))
    .leftJoin(shows, eq(shows.id, showArtists.showId))
    .where(isNotNull(artists.contactEmail))
    .orderBy(asc(artists.actName));
  const recipients = new Map<string, ArtistRecipient>();
  for (const row of rows) {
    const match = row.showKey?.match(/[1-4]/);
    recipients.set(row.id, {
      id: row.id,
      name: row.name || row.actName,
      actName: row.actName,
      email: row.email!,
      genre: 'Canadian Country',
      status: ['approved', 'shortlisted', 'finalist'].includes(row.status)
        ? 'accepted'
        : row.status === 'rejected'
          ? 'rejected'
          : row.status === 'under_review'
            ? 'under_review'
            : 'submitted',
      source: 'artist',
      ...(match ? { showNumber: Number(match[0]) as 1 | 2 | 3 | 4 } : {}),
    });
  }
  const newsletterRows = await db
    .select({
      id: subscribers.id,
      email: subscribers.emailRaw,
      emailCanonical: subscribers.emailCanonical,
    })
    .from(subscribers)
    .where(and(eq(subscribers.confirmed, true), isNull(subscribers.unsubscribedAt)))
    .orderBy(asc(subscribers.emailRaw));
  const newsletterConsentRows = newsletterRows.length
    ? await db
        .select({
          emailCanonical: emailConsents.emailCanonical,
          granted: emailConsents.granted,
          createdAt: emailConsents.createdAt,
        })
        .from(emailConsents)
        .where(
          and(
            inArray(
              emailConsents.emailCanonical,
              newsletterRows.map((row) => row.emailCanonical),
            ),
            eq(emailConsents.consentType, 'marketing'),
          ),
        )
    : [];
  const latestNewsletterConsent = new Map<string, { granted: boolean; createdAt: Date }>();
  for (const consent of newsletterConsentRows)
    if (
      !latestNewsletterConsent.has(consent.emailCanonical) ||
      latestNewsletterConsent.get(consent.emailCanonical)!.createdAt < consent.createdAt
    )
      latestNewsletterConsent.set(consent.emailCanonical, consent);
  return [
    ...recipients.values(),
    ...newsletterRows
      .filter((row) => latestNewsletterConsent.get(row.emailCanonical)?.granted)
      .map((row) => ({
        id: `newsletter:${row.id}`,
        name: 'Newsletter subscriber',
        actName: 'Newsletter subscriber',
        email: row.email,
        genre: 'Competition updates',
        status: 'submitted' as const,
        source: 'newsletter' as const,
      })),
  ];
}

export async function getAdminApplication(id: string): Promise<AdminApplicationRecord | null> {
  const [row] = await db
    .select(adminApplicationColumns)
    .from(applications)
    .innerJoin(artists, eq(artists.id, applications.artistId))
    .innerJoin(users, eq(users.id, artists.userId))
    .where(eq(applications.id, id))
    .limit(1);
  if (!row) return null;
  const counts = await getApplicationVoteStats([row.artistId]);
  const record = mapRow(row, counts.get(row.artistId));
  const assignments = await getQualifierAssignments([row.artistId]);
  return { ...record, qualifyingShow: assignments.get(row.artistId) };
}

async function getQualifierAssignments(artistIds: string[]) {
  if (!artistIds.length)
    return new Map<
      string,
      {
        id: string;
        label: string;
        showDate: string;
        startTime: string | null;
        venueName: string | null;
        venueAddress: string | null;
      }
    >();
  const rows = await db
    .select({
      artistId: showArtists.artistId,
      id: shows.id,
      label: shows.label,
      showDate: shows.showDate,
      startTime: shows.startTime,
      venueName: shows.venueName,
      venueAddress: shows.venueAddress,
    })
    .from(showArtists)
    .innerJoin(shows, eq(shows.id, showArtists.showId))
    .where(and(inArray(showArtists.artistId, artistIds), eq(shows.type, 'qualifier')));
  return new Map(
    rows.map((row) => [
      row.artistId,
      {
        id: row.id,
        label: row.label,
        showDate: row.showDate,
        startTime: row.startTime,
        venueName: row.venueName,
        venueAddress: row.venueAddress,
      },
    ]),
  );
}

async function getApplicationVoteStats(artistIds: string[]) {
  if (!artistIds.length)
    return new Map<
      string,
      {
        verifiedVotes: number;
        pendingVotes: number;
        flaggedVotes: number;
        invalidatedVotes: number;
      }
    >();
  const rows = await db
    .select({
      artistId: votes.artistId,
      verifiedVotes: sql<number>`count(*) filter (where ${votes.verified} = true and ${votes.invalidatedAt} is null)`,
      pendingVotes: sql<number>`count(*) filter (where ${votes.verified} = false and ${votes.invalidatedAt} is null)`,
      flaggedVotes: sql<number>`count(*) filter (where ${votes.fraudScore} >= 70 and ${votes.reviewDecision} <> 'cleared' and ${votes.invalidatedAt} is null)`,
      invalidatedVotes: sql<number>`count(*) filter (where ${votes.invalidatedAt} is not null)`,
    })
    .from(votes)
    .where(and(eq(votes.round, 'public_shortlist'), inArray(votes.artistId, artistIds)))
    .groupBy(votes.artistId);
  return new Map(
    rows.map((row) => [
      row.artistId,
      {
        verifiedVotes: Number(row.verifiedVotes),
        pendingVotes: Number(row.pendingVotes),
        flaggedVotes: Number(row.flaggedVotes),
        invalidatedVotes: Number(row.invalidatedVotes),
      },
    ]),
  );
}

export async function getAdminDashboardData() {
  const [applicationsRows, currentStage, phases, eventRows, votingMetrics] = await Promise.all([
    getAdminApplications(),
    getCompetitionStage(),
    getAdminCompetitionPhases(),
    getAdminShows(),
    getAdminVotingMetrics(),
  ]);
  return {
    currentStage,
    phases,
    shows: eventRows,
    applications: applicationsRows,
    votingMetrics,
    stats: {
      total: applicationsRows.length,
      pending: applicationsRows.filter(
        (app) => app.status === 'pending' && app.lifecycleStatus !== 'draft',
      ).length,
      approved: applicationsRows.filter((app) => app.status === 'approved').length,
      rejected: applicationsRows.filter((app) => app.status === 'rejected').length,
    },
  };
}

export async function getAdminCompetitionPhases() {
  return db
    .select({
      id: competitionPhases.id,
      key: competitionPhases.key,
      label: competitionPhases.label,
      startsAt: competitionPhases.startsAt,
      endsAt: competitionPhases.endsAt,
      displayOrder: competitionPhases.displayOrder,
    })
    .from(competitionPhases)
    .orderBy(asc(competitionPhases.displayOrder));
}

export async function getAdminShows() {
  const rows = await db
    .select({
      id: shows.id,
      key: shows.key,
      label: shows.label,
      type: shows.type,
      showDate: shows.showDate,
      doorsTime: shows.doorsTime,
      startTime: shows.startTime,
      contingencyDate: shows.contingencyDate,
      status: shows.status,
      statusNote: shows.statusNote,
      venueName: shows.venueName,
      venueAddress: shows.venueAddress,
      ticketUrl: shows.ticketUrl,
      assignedArtistId: showArtists.artistId,
      assignedArtistName: artists.actName,
      assignedApplicationId: applications.id,
      assignedArtistPhotoKey: artists.primaryPhotoKey,
      performanceOrder: showArtists.performanceOrder,
      advancedAt: showArtists.advanced,
    })
    .from(shows)
    .leftJoin(showArtists, eq(showArtists.showId, shows.id))
    .leftJoin(artists, eq(artists.id, showArtists.artistId))
    .leftJoin(applications, eq(applications.artistId, artists.id))
    .orderBy(asc(shows.displayOrder), asc(shows.showDate), asc(showArtists.performanceOrder));

  return rows.reduce<
    Array<{
      id: string;
      key: string;
      label: string;
      type: 'qualifier' | 'final';
      showDate: string;
      doorsTime: string | null;
      startTime: string | null;
      contingencyDate: string | null;
      status: 'scheduled' | 'postponed' | 'completed' | 'cancelled';
      statusNote: string | null;
      venueName: string | null;
      venueAddress: string | null;
      ticketUrl: string | null;
      assignedArtists: Array<{
        id: string;
        applicationId: string;
        name: string;
        avatarUrl: string | null;
        performanceOrder: number | null;
        advancedAt: Date | null;
      }>;
    }>
  >((acc, row) => {
    let current = acc.find((show) => show.id === row.id);
    if (!current) {
      current = {
        id: row.id,
        key: row.key,
        label: row.label,
        type: row.type,
        showDate: row.showDate,
        doorsTime: row.doorsTime,
        startTime: row.startTime,
        contingencyDate: row.contingencyDate,
        status: row.status,
        statusNote: row.statusNote,
        venueName: row.venueName,
        venueAddress: row.venueAddress,
        ticketUrl: row.ticketUrl,
        assignedArtists: [],
      };
      acc.push(current);
    }
    if (row.assignedArtistId && row.assignedArtistName && row.assignedApplicationId)
      current.assignedArtists.push({
        id: row.assignedArtistId,
        applicationId: row.assignedApplicationId,
        name: row.assignedArtistName,
        avatarUrl: safeMediaUrl(row.assignedArtistPhotoKey),
        performanceOrder: row.performanceOrder,
        advancedAt: row.advancedAt,
      });
    return acc;
  }, []);
}

export async function getAdminEligibleArtists() {
  return db
    .select({
      id: artists.id,
      applicationId: applications.id,
      name: artists.actName,
      avatarUrl: sql<
        string | null
      >`case when ${artists.primaryPhotoKey} is not null and ${process.env.CLOUDINARY_CLOUD_NAME ?? ''} <> '' then ${`https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME ?? ''}/image/upload/c_fill,g_auto,w_800,h_800,q_auto,f_auto/`} || ${artists.primaryPhotoKey} else null end`,
      applicationStatus: applications.status,
      profileStatus: artists.profileStatus,
      advancedToFinal: sql<boolean>`exists (
        select 1 from ${showArtists}
        inner join ${shows} on ${shows.id} = ${showArtists.showId}
        where ${showArtists.artistId} = ${artists.id}
          and ${shows.type} = 'qualifier'
          and ${showArtists.advanced} is not null
      )`,
    })
    .from(artists)
    .innerJoin(applications, eq(applications.artistId, artists.id))
    .where(inArray(applications.status, ['approved', 'shortlisted', 'finalist']))
    .orderBy(asc(artists.actName));
}

export type AdminVoteActivity = {
  id: string;
  applicationId: string;
  voterEmail: string;
  targetArtistName: string;
  timestamp: string;
  ipAddress: string;
  status: 'verified' | 'flagged' | 'blocked' | 'pending';
  fraudScore: number;
  fraudSignals: ReturnType<typeof parseFraudSignals>;
};

export async function getAdminVotingMetrics() {
  const [totals] = await db
    .select({
      total: count(),
      verified: sql<number>`count(*) filter (where ${votes.verified} = true and ${votes.invalidatedAt} is null)`,
      flagged: sql<number>`count(*) filter (where ${votes.fraudScore} >= 70 and ${votes.reviewDecision} <> 'cleared' and ${votes.invalidatedAt} is null)`,
      invalidated: sql<number>`count(*) filter (where ${votes.invalidatedAt} is not null)`,
    })
    .from(votes)
    .where(eq(votes.round, 'public_shortlist'));
  const [phase] = await db
    .select({
      startsAt: competitionPhases.startsAt,
      endsAt: competitionPhases.endsAt,
      label: competitionPhases.label,
    })
    .from(competitionPhases)
    .where(eq(competitionPhases.key, 'voting'))
    .limit(1);
  return {
    totalVotesCast: Number(totals?.verified ?? 0),
    totalAttempts: Number(totals?.total ?? 0),
    verifiedVoters: Number(totals?.verified ?? 0),
    flaggedVotes: Number(totals?.flagged ?? 0),
    invalidatedVotes: Number(totals?.invalidated ?? 0),
    votingWindow: phase
      ? { startsAt: phase.startsAt, endsAt: phase.endsAt, label: phase.label }
      : null,
    isVotingOpen: await (async () => {
      const stage = await getCompetitionStage();
      return stage === 'voting' && (await getFeatureFlag('VOTING_OPEN'));
    })(),
  };
}

function voteStatus(row: {
  verified: boolean;
  invalidatedAt: Date | null;
  fraudScore: number;
  reviewDecision?: string | null;
}) {
  if (row.invalidatedAt) return 'blocked' as const;
  if (!row.verified) return 'pending' as const;
  if (row.reviewDecision === 'cleared') return 'verified' as const;
  if (row.fraudScore >= 70) return 'flagged' as const;
  return 'verified' as const;
}

export async function getAdminVoteActivity(limit = 100): Promise<AdminVoteActivity[]> {
  const rows = await db
    .select({
      id: votes.id,
      applicationId: applications.id,
      voterEmail: votes.emailRaw,
      targetArtistName: artists.actName,
      createdAt: votes.createdAt,
      ipHash: votes.ipHash,
      verified: votes.verified,
      invalidatedAt: votes.invalidatedAt,
      fraudScore: votes.fraudScore,
      fraudSignals: votes.fraudSignals,
      reviewDecision: votes.reviewDecision,
    })
    .from(votes)
    .innerJoin(artists, eq(artists.id, votes.artistId))
    .innerJoin(applications, eq(applications.artistId, artists.id))
    .where(eq(votes.round, 'public_shortlist'))
    .orderBy(desc(votes.createdAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    applicationId: row.applicationId,
    voterEmail: row.voterEmail,
    targetArtistName: row.targetArtistName,
    timestamp: row.createdAt.toISOString(),
    ipAddress: row.ipHash ? `${row.ipHash.slice(0, 10)}...` : 'Unknown',
    status: voteStatus(row),
    fraudScore: row.fraudScore,
    fraudSignals: parseFraudSignals(row.fraudSignals),
  }));
}

export async function getAdminVotingLeaderboard() {
  const rows = await db
    .select({
      id: artists.id,
      applicationId: applications.id,
      name: artists.actName,
      genre: artists.actType,
      avatarKey: artists.primaryPhotoKey,
      totalVotes: sql<number>`count(${votes.id}) filter (where ${votes.verified} = true and ${votes.invalidatedAt} is null)`,
      flaggedVotes: sql<number>`count(${votes.id}) filter (where ${votes.fraudScore} >= 70 and ${votes.reviewDecision} <> 'cleared' and ${votes.invalidatedAt} is null)`,
      pendingVotes: sql<number>`count(${votes.id}) filter (where ${votes.verified} = false and ${votes.invalidatedAt} is null)`,
    })
    .from(artists)
    .innerJoin(applications, eq(applications.artistId, artists.id))
    .leftJoin(votes, and(eq(votes.artistId, artists.id), eq(votes.round, 'public_shortlist')))
    .where(
      and(
        eq(artists.profileStatus, 'published'),
        inArray(applications.status, ['approved', 'shortlisted', 'finalist']),
      ),
    )
    .groupBy(artists.id, applications.id)
    .orderBy(
      desc(
        sql`count(${votes.id}) filter (where ${votes.verified} = true and ${votes.invalidatedAt} is null)`,
      ),
      asc(artists.actName),
    );
  const total = rows.reduce((sum, row) => sum + Number(row.totalVotes ?? 0), 0);
  return rows.map((row, index) => ({
    id: row.id,
    applicationId: row.applicationId,
    rank: index + 1,
    name: row.name,
    genre: row.genre === 'band' ? 'Country band' : 'Country artist',
    avatarUrl:
      row.avatarKey && process.env.CLOUDINARY_CLOUD_NAME
        ? `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/c_fill,g_auto,w_160,h_160,q_auto,f_auto/${row.avatarKey}`
        : null,
    initials: row.name
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
    totalVotes: Number(row.totalVotes ?? 0),
    flaggedVotes: Number(row.flaggedVotes ?? 0),
    pendingVotes: Number(row.pendingVotes ?? 0),
    votePercentage: total ? Number(((Number(row.totalVotes ?? 0) / total) * 100).toFixed(1)) : 0,
    momentum: 'steady' as const,
  }));
}

export async function getAdminVoteDetail(id: string) {
  const [vote] = await db
    .select({
      id: votes.id,
      applicationId: applications.id,
      voterEmail: votes.emailRaw,
      emailCanonical: votes.emailCanonical,
      artistId: artists.id,
      artistName: artists.actName,
      createdAt: votes.createdAt,
      verified: votes.verified,
      verifiedAt: votes.verifiedAt,
      invalidatedAt: votes.invalidatedAt,
      invalidationReason: votes.invalidationReason,
      fraudScore: votes.fraudScore,
      fraudSignals: votes.fraudSignals,
      ipHash: votes.ipHash,
      deviceHash: votes.deviceHash,
      userAgentHash: votes.userAgentHash,
      reviewDecision: votes.reviewDecision,
      reviewNotes: votes.reviewNotes,
    })
    .from(votes)
    .innerJoin(artists, eq(artists.id, votes.artistId))
    .innerJoin(applications, eq(applications.artistId, artists.id))
    .where(eq(votes.id, id))
    .limit(1);
  if (!vote) return null;
  const [history] = await Promise.all([
    db
      .select({
        id: votes.id,
        createdAt: votes.createdAt,
        artistName: artists.actName,
        verified: votes.verified,
        invalidatedAt: votes.invalidatedAt,
        fraudScore: votes.fraudScore,
        reviewDecision: votes.reviewDecision,
      })
      .from(votes)
      .innerJoin(artists, eq(artists.id, votes.artistId))
      .where(or(eq(votes.ipHash, vote.ipHash ?? ''), eq(votes.deviceHash, vote.deviceHash ?? '')))
      .orderBy(desc(votes.createdAt))
      .limit(50),
  ]);
  return {
    ...vote,
    fraudSignals: parseFraudSignals(vote.fraudSignals),
    status: voteStatus(vote),
    history: history.map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      artistName: item.artistName,
      status: voteStatus(item),
    })),
  };
}
