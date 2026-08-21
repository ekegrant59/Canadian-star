export type EmailAudienceFilter =
  | 'all_artists'
  | 'approved_artists'
  | 'pending_artists'
  | 'rejected_artists'
  | 'show_1_artists'
  | 'show_2_artists'
  | 'show_3_artists'
  | 'show_4_artists'
  | 'single_artist'
  | 'all_voters'
  | 'verified_voters'
  | 'newsletter_subscribers';

export interface ArtistRecipient {
  id: string;
  name: string;
  actName: string;
  email: string;
  genre: string;
  status: 'submitted' | 'under_review' | 'accepted' | 'rejected';
  showNumber?: 1 | 2 | 3 | 4;
  source?: 'artist' | 'newsletter';
}

export interface EmailLayoutProps {
  title: string;
  previewText?: string;
  heroCategory?: string;
  heroHeadline: string;
  heroImageUrl?: string;
  contentHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  securityNotice?: string;
  hideHeroImage?: boolean;
}

export interface ArtistApplicationReceivedEmailProps {
  artistName: string;
  applicationId?: string;
  dashboardUrl?: string;
}

export interface ArtistApplicationApprovedEmailProps {
  artistName: string;
  actName?: string;
  dashboardUrl?: string;
  nextStageName?: string;
}

export interface ArtistApplicationRejectedEmailProps {
  artistName: string;
  competitionUrl?: string;
}

export interface ArtistApplicationStageEmailProps {
  artistName: string;
  actName?: string;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'shortlisted' | 'finalist';
  dashboardUrl?: string;
}

export interface VotingOtpEmailProps {
  artistName: string;
  code: string;
  votingUrl?: string;
}

export interface VoteConfirmedEmailProps {
  voterEmail?: string;
  artistName: string;
  artistGenre?: string;
  artistImageUrl?: string;
  artistProfileUrl?: string;
  shareUrl?: string;
}

export interface Final16AnnouncementEmailProps {
  artistName?: string;
  finalistsUrl?: string;
}

export interface FinalCallForVotesEmailProps {
  votingUrl?: string;
  hoursRemaining?: number;
}

export interface AdminVoteFlagAlertEmailProps {
  voteId: string;
  voterEmail: string;
  ipAddress: string;
  flagRule: string;
  severity: 'Low' | 'Medium' | 'High';
  reviewUrl: string;
}

export interface CustomBroadcastEmailProps {
  headline: string;
  category?: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  heroImageUrl?: string;
}

export interface EmailTemplateDefinition {
  id: string;
  name: string;
  description: string;
  category:
    'Artist Onboarding' | 'Voting & Security' | 'Competition Updates' | 'Admin & Operations';
  defaultSubject: string;
  defaultHeadline: string;
  defaultCategory?: string;
  defaultCtaText?: string;
  defaultCtaUrl?: string;
  defaultContent: string;
  isSystem: boolean;
}
