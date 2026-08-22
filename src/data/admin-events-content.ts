export interface TimelinePhase {
  id: string;
  stepNumber: string;
  name: string;
  dateRange: string;
  status: 'closed' | 'active' | 'upcoming';
  startDate?: string;
  endDate?: string;
}

export interface FinalistArtist {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
  initials: string;
}

export interface CompetitionEvent {
  id: string;
  key: string;
  name: string;
  type: 'qualifying' | 'grand_finale' | 'showcase' | 'masterclass';
  status: 'completed' | 'upcoming' | 'on_sale' | 'draft' | 'sold_out';
  date: string;
  time: string;
  venueName: string;
  venueAddress: string;
  ticketUrl: string;
  assignedArtistIds: string[];
  isGrandFinal?: boolean;
}

export interface JudgeRecord {
  id: string;
  name: string;
  role: string;
  bio: string;
  avatarUrl: string;
  status: 'confirmed' | 'prospect';
}

export interface SponsorRecord {
  id: string;
  name: string;
  websiteUrl: string;
  logoUrl: string;
  tier: 'title' | 'presenting' | 'community';
}

export interface ContentManagementState {
  homepageAnnouncement: {
    enabled: boolean;
    status: 'active' | 'inactive';
    headline: string;
    subtext: string;
  };
  competitionStatus: {
    currentPhase: string;
    phaseEndDate: string;
    publicMessage: string;
  };
  judges: JudgeRecord[];
  sponsors: SponsorRecord[];
  overview: {
    activeJudges: number;
    sponsorLogos: number;
    lastUpdated: string;
  };
}

export const INITIAL_TIMELINE_PHASES: TimelinePhase[] = [
  {
    id: 'phase-1',
    stepNumber: '01',
    name: 'Applications',
    dateRange: 'Oct 1 – Nov 15',
    status: 'closed',
  },
  {
    id: 'phase-2',
    stepNumber: '02',
    name: 'Fan Voting',
    dateRange: 'Nov 20 – Dec 10',
    status: 'active',
    startDate: '2026-11-20',
    endDate: '2026-12-10',
  },
  {
    id: 'phase-3',
    stepNumber: '03',
    name: 'Industry Review',
    dateRange: 'Dec 12 – Dec 20',
    status: 'upcoming',
  },
  {
    id: 'phase-4',
    stepNumber: '04',
    name: 'Final 16 Announcement',
    dateRange: 'Jan 5',
    status: 'upcoming',
  },
  {
    id: 'phase-5',
    stepNumber: '05',
    name: 'Live Competition',
    dateRange: 'Jan 9 – Jan 30',
    status: 'upcoming',
  },
];

export const FINALIST_ARTISTS_POOL: FinalistArtist[] = [
  {
    id: 'art-001',
    name: 'Julian Vance',
    role: 'Vocalist / Guitar',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    initials: 'JV',
  },
  {
    id: 'art-002',
    name: 'Elena Rostova',
    role: 'Pianist / Songwriter',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
    initials: 'ER',
  },
  {
    id: 'art-003',
    name: 'Marcus Dean',
    role: 'Drummer / Percussion',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
    initials: 'MD',
  },
  {
    id: 'art-004',
    name: 'Sarah Thorne',
    role: 'Lead Guitarist',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80',
    initials: 'ST',
  },
  {
    id: 'art-005',
    name: 'Claire McKenzie',
    role: 'Acoustic / Folk',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
    initials: 'CM',
  },
  {
    id: 'art-006',
    name: 'The Rust Belt',
    role: 'Southern Rock Band',
    avatarUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
    initials: 'RB',
  },
  {
    id: 'art-007',
    name: 'Wyatt Brooks',
    role: 'Country Vocalist',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80',
    initials: 'WB',
  },
  {
    id: 'art-008',
    name: 'Savannah Reid',
    role: 'Contemporary Country',
    avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=80',
    initials: 'SR',
  },
  {
    id: 'art-009',
    name: 'Neon Heights',
    role: 'Alt-Country Duo',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&q=80',
    initials: 'NH',
  },
  {
    id: 'art-010',
    name: 'Elias Thorne',
    role: 'Roots & Blues',
    avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&q=80',
    initials: 'ET',
  },
  {
    id: 'art-011',
    name: "Maeve O'Connor",
    role: 'Bluegrass & Fiddle',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80',
    initials: 'MO',
  },
  {
    id: 'art-012',
    name: 'Timber & Wire',
    role: 'Outlaw Country Band',
    avatarUrl: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&q=80',
    initials: 'TW',
  },
  {
    id: 'art-013',
    name: 'Hannah Hayes',
    role: 'Pop Country Vocalist',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
    initials: 'HH',
  },
  {
    id: 'art-014',
    name: 'Cody Sterling',
    role: 'Heartland Rocker',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    initials: 'CS',
  },
  {
    id: 'art-015',
    name: 'Dakota Sky',
    role: 'Indie Country Duo',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
    initials: 'DS',
  },
  {
    id: 'art-016',
    name: 'Brockville Boys',
    role: '4-Piece Country Band',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
    initials: 'BB',
  },
];

export const INITIAL_COMPETITION_EVENTS: CompetitionEvent[] = [
  {
    id: 'EVT-001',
    key: 'qualifier-1',
    name: 'Qualifying Show 1',
    type: 'qualifying',
    status: 'completed',
    date: '2026-10-12',
    time: '19:00',
    venueName: 'The Roxy Theatre, LA',
    venueAddress: '9009 Sunset Blvd, West Hollywood, CA 90069',
    ticketUrl: 'https://tickets.nextgreatcanadiancountrystar.ca/show-1',
    assignedArtistIds: ['art-001', 'art-002'],
  },
  {
    id: 'EVT-002',
    key: 'qualifier-2',
    name: 'Qualifying Show 2',
    type: 'qualifying',
    status: 'upcoming',
    date: '2026-10-19',
    time: '19:00',
    venueName: 'Brooklyn Steel, NYC',
    venueAddress: '319 Frost St, Brooklyn, NY 11222',
    ticketUrl: 'https://tickets.nextgreatcanadiancountrystar.ca/show-2',
    assignedArtistIds: [],
  },
  {
    id: 'EVT-003',
    key: 'qualifier-3',
    name: 'Qualifying Show 3',
    type: 'qualifying',
    status: 'on_sale',
    date: '2026-10-26',
    time: '20:00',
    venueName: 'Thalia Hall, Chicago',
    venueAddress: '1807 S Allport St, Chicago, IL 60608',
    ticketUrl: 'https://tickets.nextgreatcanadiancountrystar.ca/show-3',
    assignedArtistIds: [],
  },
  {
    id: 'EVT-004',
    key: 'grand-final',
    name: 'Grand Final',
    type: 'grand_finale',
    status: 'upcoming',
    date: '2026-11-16',
    time: '20:00',
    venueName: 'Red Rocks Amphitheatre',
    venueAddress: '18300 W Alameda Pkwy, Morrison, CO 80465',
    ticketUrl: 'https://tickets.nextgreatcanadiancountrystar.ca/grand-finale',
    assignedArtistIds: [],
    isGrandFinal: true,
  },
];

export const INITIAL_CONTENT_STATE: ContentManagementState = {
  homepageAnnouncement: {
    enabled: true,
    status: 'active',
    headline: 'Call for Entries: Canadian Star 2026',
    subtext:
      'Submissions are now open for Ontario’s premier emerging music competition. Deadline approaching fast.',
  },
  competitionStatus: {
    currentPhase: 'Review Phase',
    phaseEndDate: '2026-11-15',
    publicMessage:
      'Judges are currently reviewing round 1 submissions. Public voting begins next week.',
  },
  judges: [
    {
      id: 'jdg-001',
      name: 'E. Vance',
      role: 'Lead Juror',
      bio: 'Grammy-nominated record producer with 20+ years producing chart-topping country and roots albums.',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
      status: 'confirmed',
    },
    {
      id: 'jdg-002',
      name: 'M. Reeves',
      role: 'Technical Judge',
      bio: 'Nashville touring musical director and vocal coach specializing in live acoustic and full-band acoustics.',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
      status: 'confirmed',
    },
  ],
  sponsors: [
    {
      id: 'spn-001',
      name: 'Kawartha Soundworks',
      websiteUrl: 'https://kawarthasoundworks.example.com',
      logoUrl: '/designs/admin/Admin - Content Management.svg',
      tier: 'title',
    },
    {
      id: 'spn-002',
      name: 'Ontario Music Fund',
      websiteUrl: 'https://ontariomusic.example.ca',
      logoUrl: '/designs/admin/Admin - Content Management.svg',
      tier: 'presenting',
    },
  ],
  overview: {
    activeJudges: 12,
    sponsorLogos: 8,
    lastUpdated: '2 hrs ago',
  },
};
