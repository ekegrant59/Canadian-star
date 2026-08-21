export type LandingStage = 'applications' | 'voting' | 'anticipation' | 'finalists';
export type LandingStageKey = LandingStage;

export interface BasePublicArtist {
  id: string;
  name: string;
  slug: string;
  hometown: string;
  genre: string;
  actType: 'solo' | 'duo' | 'band';
  photoUrl: string;
  bioSnippet?: string;
  audioSampleTitle?: string;
  websiteUrl?: string | null;
  performanceVideoUrl?: string | null;
  socialLinks?: Record<string, string>;
  musicLinks?: Record<string, string>;
  formationYear?: number | null;
  memberCount?: number | null;
  applicationStatus?: 'approved' | 'shortlisted' | 'finalist';
}

export interface VotingArtist extends BasePublicArtist {
  isShortlisted?: boolean;
  musicMetadata?: Array<{
    url: string;
    title: string;
    subtitle: string | null;
    image: string | null;
  }>;
}

export interface FinalistArtist extends BasePublicArtist {
  showNumber: 1 | 2 | 3 | 4;
  showTitle: string;
  showDate: string;
  ticketUrl: string;
  roundAssignment?: string;
}

export interface FinalistShow {
  showNumber: 1 | 2 | 3 | 4;
  title: string;
  date: string;
  badgeNumber?: string;
  venueName?: string | null;
  venueAddress?: string | null;
}

export interface StageCta {
  label: string;
  href: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

export interface LandingCountdownInfo {
  targetDate: string; // ISO string or human readable
  label: string;
  subLabel?: string;
  isUrgent?: boolean;
}

export interface LandingStageViewModel {
  stage: LandingStage;
  kicker: string;
  headline: string;
  subhead: string;
  datePillText?: string;
  locationPillText?: string;
  primaryCta: StageCta;
  countdown?: LandingCountdownInfo;
  votingOpen?: boolean;
  votingArtists?: VotingArtist[];
  finalists?: FinalistArtist[];
  finalistShows?: FinalistShow[];
  grandFinal?: boolean;
}
