export interface LiveVoteActivityItem {
  id: string;
  rawVoteId: string;
  voterEmail: string;
  targetArtistId: string;
  targetArtistName: string;
  timestamp: string;
  ipAddress: string;
  status: 'verified' | 'flagged' | 'blocked';
  fraudScore?: number;
}

export interface LeaderboardArtistItem {
  rank: number;
  id: string;
  name: string;
  genre: string;
  totalVotes: number;
  votePercentage: number;
  momentum: 'up' | 'down' | 'neutral';
  avatarUrl?: string;
  initials: string;
  qualifyingShow?: string;
}

export interface IntegrityFlag {
  id: string;
  title: string;
  description: string;
  rule: string;
  severity: 'High' | 'Medium' | 'Low';
  iconType: 'velocity' | 'subnet' | 'proxy' | 'device';
}

export interface VotingHistoryRecord {
  id: string;
  timestamp: string;
  voteId: string;
  targetArtist: string;
  status: 'FLAGGED' | 'ACCEPTED' | 'REJECTED';
}

export interface DecisionLogEntry {
  id: string;
  author: string;
  timestamp: string;
  text: string;
}

export interface VoteIntegrityDetail {
  voteId: string;
  status: 'flagged' | 'verified' | 'blocked';
  voterEmail: string;
  voterJoinedDate: string;
  voterStatus: string;
  ipAddress: string;
  deviceFingerprint: string;
  browserOS: string;
  targetArtist: string;
  targetArtistGenre: string;
  flags: IntegrityFlag[];
  recentHistory: VotingHistoryRecord[];
  decisionLogs: DecisionLogEntry[];
}

export const INITIAL_VOTING_METRICS = {
  totalVotesCast: 142894,
  votesTrendText: '+12% since last hour',
  votesTrendLeaderboard: '+12% since yesterday',
  verifiedVoters: 89012,
  verificationRate: '62.3%',
  activeVotingWindow: 'Oct 15 - Oct 25, 2026',
  windowClosesIn: 'Closes in 48 hours',
  daysRemaining: '14 Days Remaining',
  phaseClosesDate: 'Oct 24, 2026',
  currentLeaderName: 'Elena Rostova',
  currentLeaderVotes: 34512,
  currentLeaderPercentage: 24.1,
  currentLeaderGenre: 'Classical Crossover',
  isVotingOpen: true,
};

export const INITIAL_LIVE_VOTES: LiveVoteActivityItem[] = [
  {
    id: 'vote-8472-a',
    rawVoteId: '#8472-A',
    voterEmail: 'm.chen@example.com',
    targetArtistId: 'elena-rostova',
    targetArtistName: 'Elena Rodriguez',
    timestamp: 'Oct 23, 15:02 UTC',
    ipAddress: '192.168.1.45',
    status: 'verified',
    fraudScore: 4,
  },
  {
    id: 'vote-8472-b',
    rawVoteId: '#8472-B',
    voterEmail: 'user.1489@example.com',
    targetArtistId: 'the-neon-pulse',
    targetArtistName: 'The Neon Pulse',
    timestamp: 'Oct 23, 14:32 UTC',
    ipAddress: '203.0.113.12',
    status: 'flagged',
    fraudScore: 82,
  },
  {
    id: 'vote-8470-x',
    rawVoteId: '#8470-X',
    voterEmail: 'bot_99@proxy.net',
    targetArtistId: 'elena-rostova',
    targetArtistName: 'Elena Rodriguez',
    timestamp: 'Oct 23, 14:15 UTC',
    ipAddress: '185.23.44.101',
    status: 'blocked',
    fraudScore: 98,
  },
  {
    id: 'vote-8468-m',
    rawVoteId: '#8468-M',
    voterEmail: 'sarah.j@domain.com',
    targetArtistId: 'marcus-thorne',
    targetArtistName: 'Marcus Thorne',
    timestamp: 'Oct 23, 14:08 UTC',
    ipAddress: '72.14.192.1',
    status: 'verified',
    fraudScore: 2,
  },
  {
    id: 'vote-8465-k',
    rawVoteId: '#8465-K',
    voterEmail: 'devon.r@bell.net',
    targetArtistId: 'the-nova-collective',
    targetArtistName: 'The Nova Collective',
    timestamp: 'Oct 23, 13:58 UTC',
    ipAddress: '142.214.88.19',
    status: 'verified',
    fraudScore: 6,
  },
  {
    id: 'vote-8461-p',
    rawVoteId: '#8461-P',
    voterEmail: 'alex.k992@rogers.ca',
    targetArtistId: 'sarah-the-artisans',
    targetArtistName: 'Sarah & The Artisans',
    timestamp: 'Oct 23, 13:42 UTC',
    ipAddress: '192.168.45.201',
    status: 'flagged',
    fraudScore: 75,
  },
  {
    id: 'vote-8459-q',
    rawVoteId: '#8459-Q',
    voterEmail: 'toronto_fan_23@gmail.com',
    targetArtistId: 'dj-kinetik',
    targetArtistName: 'DJ Kinetik',
    timestamp: 'Oct 23, 13:30 UTC',
    ipAddress: '99.231.10.4',
    status: 'verified',
    fraudScore: 3,
  },
  {
    id: 'vote-8455-d',
    rawVoteId: '#8455-D',
    voterEmail: 'crawler_cluster_04@darkweb.io',
    targetArtistId: 'the-rust-belt',
    targetArtistName: 'The Rust Belt',
    timestamp: 'Oct 23, 13:12 UTC',
    ipAddress: '103.251.167.22',
    status: 'blocked',
    fraudScore: 99,
  },
];

export const INITIAL_LEADERBOARD: LeaderboardArtistItem[] = [
  {
    rank: 1,
    id: 'elena-rostova',
    name: 'Elena Rostova',
    genre: 'Classical Crossover',
    totalVotes: 34512,
    votePercentage: 24.1,
    momentum: 'up',
    avatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    initials: 'ER',
    qualifyingShow: 'Show 1',
  },
  {
    rank: 2,
    id: 'the-nova-collective',
    name: 'The Nova Collective',
    genre: 'Electronic',
    totalVotes: 26480,
    votePercentage: 18.5,
    momentum: 'up',
    avatarUrl:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=80',
    initials: 'NC',
    qualifyingShow: 'Show 2',
  },
  {
    rank: 3,
    id: 'marcus-chen',
    name: 'Marcus Chen',
    genre: 'Acoustic',
    totalVotes: 21780,
    votePercentage: 15.2,
    momentum: 'neutral',
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    initials: 'MC',
    qualifyingShow: 'Show 1',
  },
  {
    rank: 4,
    id: 'sarah-the-artisans',
    name: 'Sarah & The Artisans',
    genre: 'Indie Rock',
    totalVotes: 18340,
    votePercentage: 12.8,
    momentum: 'down',
    initials: 'SA',
    qualifyingShow: 'Show 3',
  },
  {
    rank: 5,
    id: 'dj-kinetik',
    name: 'DJ Kinetik',
    genre: 'Electronic',
    totalVotes: 14892,
    votePercentage: 10.4,
    momentum: 'up',
    initials: 'DJ',
    qualifyingShow: 'Show 4',
  },
  {
    rank: 6,
    id: 'liam-carter',
    name: 'Liam Carter',
    genre: 'Country',
    totalVotes: 11450,
    votePercentage: 8.0,
    momentum: 'up',
    avatarUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    initials: 'LC',
    qualifyingShow: 'Show 2',
  },
  {
    rank: 7,
    id: 'the-rust-belt',
    name: 'The Rust Belt',
    genre: 'Southern Rock',
    totalVotes: 8910,
    votePercentage: 6.2,
    momentum: 'neutral',
    avatarUrl:
      'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=150&auto=format&fit=crop&q=80',
    initials: 'RB',
    qualifyingShow: 'Show 3',
  },
  {
    rank: 8,
    id: 'julian-vance',
    name: 'Julian Vance',
    genre: 'Vocalist / Guitar',
    totalVotes: 5120,
    votePercentage: 3.6,
    momentum: 'down',
    avatarUrl:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    initials: 'JV',
    qualifyingShow: 'Show 1',
  },
  {
    rank: 9,
    id: 'claire-mckenzie',
    name: 'Claire McKenzie',
    genre: 'Acoustic / Folk',
    totalVotes: 3210,
    votePercentage: 2.2,
    momentum: 'neutral',
    avatarUrl:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    initials: 'CM',
    qualifyingShow: 'Show 4',
  },
  {
    rank: 10,
    id: 'neha-patel',
    name: 'Neha Patel',
    genre: 'Pop / Crossover',
    totalVotes: 1800,
    votePercentage: 1.3,
    momentum: 'up',
    initials: 'NP',
    qualifyingShow: 'Show 2',
  },
];

export const VOTE_SHARE_DISTRIBUTION = [
  { label: 'Elena Rostova', percentage: 24.1, color: '#FF5C00' },
  { label: 'The Nova Collective', percentage: 18.5, color: '#E05200' },
  { label: 'Marcus Chen', percentage: 15.2, color: '#C2410C' },
  { label: 'Top 4–5', percentage: 23.2, color: '#9A3412' },
  { label: 'Others', percentage: 19.0, color: '#7C2D12' },
];

export const DEFAULT_VOTE_INTEGRITY_DETAILS: Record<string, VoteIntegrityDetail> = {
  'vote-8472-b': {
    voteId: '#8472-B',
    status: 'flagged',
    voterEmail: 'user.1489@example.com',
    voterJoinedDate: 'Oct 12, 2026',
    voterStatus: 'Verified',
    ipAddress: '192.168.45.201',
    deviceFingerprint: 'a8f93j2k-99bb-4c12-88f1-3300ab9c9d8e',
    browserOS: 'Chrome 118.0.0.0 / Windows 10',
    targetArtist: 'Liam Carter',
    targetArtistGenre: 'Country',
    flags: [
      {
        id: 'flag-1',
        title: 'High Velocity Voting',
        description: '14 votes cast from this IP address within a 60-second window.',
        rule: 'Rule: VF-004',
        severity: 'High',
        iconType: 'velocity',
      },
      {
        id: 'flag-2',
        title: 'Suspicious Subnet Activity',
        description:
          'Multiple accounts authenticating from similar IP block (192.168.45.x) targeting the same contestant.',
        rule: 'Rule: NET-102',
        severity: 'Medium',
        iconType: 'subnet',
      },
    ],
    recentHistory: [
      {
        id: 'hist-1',
        timestamp: '2026-10-24 18:42:15',
        voteId: '#8472-B',
        targetArtist: 'Liam Carter',
        status: 'FLAGGED',
      },
      {
        id: 'hist-2',
        timestamp: '2026-10-24 18:42:12',
        voteId: '#8471-C',
        targetArtist: 'Liam Carter',
        status: 'ACCEPTED',
      },
      {
        id: 'hist-3',
        timestamp: '2026-10-24 18:42:08',
        voteId: '#8469-A',
        targetArtist: 'Liam Carter',
        status: 'ACCEPTED',
      },
      {
        id: 'hist-4',
        timestamp: '2026-10-24 18:41:55',
        voteId: '#8450-F',
        targetArtist: 'Liam Carter',
        status: 'ACCEPTED',
      },
      {
        id: 'hist-5',
        timestamp: '2026-10-23 20:15:02',
        voteId: '#7102-X',
        targetArtist: 'Sarah Jenkins',
        status: 'ACCEPTED',
      },
    ],
    decisionLogs: [
      {
        id: 'note-1',
        author: 'Admin (J.Smith)',
        timestamp: 'Oct 24, 19:05',
        text: 'Automated flag triggered. Pending manual review of velocity logs before taking action.',
      },
    ],
  },
};
