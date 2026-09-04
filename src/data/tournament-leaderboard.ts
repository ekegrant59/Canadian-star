export type ShowStatus = 'completed' | 'live' | 'upcoming' | 'pending';
export type ContenderStatus = 'winner' | 'eliminated' | 'competing' | 'scheduled' | 'pending';

export interface TournamentContender {
  id: string;
  name: string;
  slug: string;
  photoUrl: string;
  hometown: string;
  genre: string;
  status: ContenderStatus;
  goldenTicketLabel?: string;
  verified?: boolean;
}

export interface TournamentShow {
  id: string;
  showNumber: number;
  title: string;
  city: string;
  venue: string;
  dateText: string;
  status: ShowStatus;
  statusLabel: string;
  winner: TournamentContender | null;
  contenders: TournamentContender[];
  ticketUrl: string;
}

export interface GrandFinaleInfo {
  id: string;
  title: string;
  headline: string;
  dateText: string;
  venue: string;
  status: ShowStatus;
  statusLabel: string;
  finalists: (TournamentContender | null)[];
  winner: TournamentContender | null;
}

export interface TournamentStateData {
  phaseKey: string;
  phaseLabel: string;
  phaseDescription: string;
  kicker: string;
  headline: string;
  subhead: string;
  shows: TournamentShow[];
  grandFinale: GrandFinaleInfo;
}

// -------------------------------------------------------------
// Sample Artists matching designs and project aesthetic
// -------------------------------------------------------------
const JACKSON_REED: TournamentContender = {
  id: 'art-reed',
  name: 'Jackson Reed',
  slug: 'jackson-reed',
  photoUrl: '/images/artists/artist_1.jpg',
  hometown: 'Calgary, AB',
  genre: 'Contemporary Country',
  status: 'winner',
  goldenTicketLabel: 'GOLDEN TICKET #1',
  verified: true,
};

const SARAH_VANCE: TournamentContender = {
  id: 'art-vance',
  name: 'Sarah Vance',
  slug: 'sarah-vance',
  photoUrl: '/images/artists/artist_2.jpg',
  hometown: 'Halifax, NS',
  genre: 'Modern Folk Country',
  status: 'winner',
  goldenTicketLabel: 'GOLDEN TICKET #2',
  verified: true,
};

const WYATT_STONE: TournamentContender = {
  id: 'art-stone',
  name: 'Wyatt Stone',
  slug: 'wyatt-stone',
  photoUrl: '/images/artists/artist_3.jpg',
  hometown: 'Toronto, ON',
  genre: 'Outlaw Country',
  status: 'competing',
  verified: true,
};

const CHLOE_JENKINS: TournamentContender = {
  id: 'art-jenkins',
  name: 'Chloe Jenkins',
  slug: 'chloe-jenkins',
  photoUrl: '/images/artists/artist_4.jpg',
  hometown: 'Kingston, ON',
  genre: 'Country Pop',
  status: 'competing',
  verified: true,
};

const LIAM_OCONNOR: TournamentContender = {
  id: 'art-oconnor',
  name: "Liam O'Connor",
  slug: 'liam-oconnor',
  photoUrl: '/images/artists/artist_5.jpg',
  hometown: 'Ottawa, ON',
  genre: 'Bluegrass & Roots',
  status: 'competing',
  verified: true,
};

const RUBY_LANE: TournamentContender = {
  id: 'art-lane',
  name: 'Ruby Lane',
  slug: 'ruby-lane',
  photoUrl: '/images/artists/artist_6.jpg',
  hometown: 'Sudbury, ON',
  genre: 'Alt-Country',
  status: 'competing',
  verified: true,
};

// Eliminated for Show 1
const SHOW_1_ELIMINATED: TournamentContender[] = [
  {
    id: 'art-elena',
    name: 'Elena Rostova',
    slug: 'elena-rostova',
    photoUrl: '/images/artists/artist_7.jpg',
    hometown: 'Edmonton, AB',
    genre: 'Traditional Country',
    status: 'eliminated',
  },
  {
    id: 'art-david',
    name: 'David Chen',
    slug: 'david-chen',
    photoUrl: '/images/artists/artist_8.jpg',
    hometown: 'Red Deer, AB',
    genre: 'Country Rock',
    status: 'eliminated',
  },
  {
    id: 'art-marcus',
    name: 'Marcus Thorne',
    slug: 'marcus-thorne',
    photoUrl: '/images/artists/artist_9.jpg',
    hometown: 'Lethbridge, AB',
    genre: 'Americana',
    status: 'eliminated',
  },
];

// Eliminated for Show 2
const SHOW_2_ELIMINATED: TournamentContender[] = [
  {
    id: 'art-jordan-m',
    name: 'Jordan Miller',
    slug: 'jordan-miller',
    photoUrl: '/images/artists/artist_10.jpg',
    hometown: 'Dartmouth, NS',
    genre: 'Acoustic Country',
    status: 'eliminated',
  },
  {
    id: 'art-claire-b',
    name: 'Claire Beauchamp',
    slug: 'claire-beauchamp',
    photoUrl: '/images/artists/artist_11.jpg',
    hometown: 'Moncton, NB',
    genre: 'Roots Country',
    status: 'eliminated',
  },
  {
    id: 'art-tate',
    name: 'Tate MacLeod',
    slug: 'tate-macleod',
    photoUrl: '/images/artists/artist_12.png',
    hometown: 'Sydney, NS',
    genre: 'Honky Tonk',
    status: 'eliminated',
  },
];

// Contenders for Show 4 (Vancouver)
const SHOW_4_CONTENDERS: TournamentContender[] = [
  {
    id: 'art-brody',
    name: 'Brody Miller',
    slug: 'brody-miller',
    photoUrl: '/images/artists/artist_13.jpg',
    hometown: 'Vancouver, BC',
    genre: 'Modern Country',
    status: 'scheduled',
    verified: true,
  },
  {
    id: 'art-haley',
    name: 'Haley Cross',
    slug: 'haley-cross',
    photoUrl: '/images/artists/artist_14.png',
    hometown: 'Victoria, BC',
    genre: 'Country Pop',
    status: 'scheduled',
    verified: true,
  },
  {
    id: 'art-tyler',
    name: 'Tyler Finch',
    slug: 'tyler-finch',
    photoUrl: '/images/artists/artist_15.png',
    hometown: 'Kelowna, BC',
    genre: 'Country Rock',
    status: 'scheduled',
    verified: true,
  },
  {
    id: 'art-beau',
    name: 'Beau Blackwood',
    slug: 'beau-blackwood',
    photoUrl: '/images/artists/artist_16.png',
    hometown: 'Kamloops, BC',
    genre: 'Roots Rock',
    status: 'scheduled',
    verified: true,
  },
];

// Placeholder for unselected/mystery contender
function createPendingContender(index: number): TournamentContender {
  return {
    id: `pending-${index}`,
    name: `Contender #${index}`,
    slug: '',
    photoUrl: '',
    hometown: 'Selection in progress',
    genre: 'Emerging Artist',
    status: 'pending',
  };
}

// -------------------------------------------------------------
// PRESET 1: ACTIVE BATTLE (Exact Match to leaderboard.svg & Main.svg)
// -------------------------------------------------------------
export const PRESET_ACTIVE_BATTLE: TournamentStateData = {
  phaseKey: 'active',
  phaseLabel: 'Live Battle (Current)',
  phaseDescription: 'Show 1 & 2 completed, Show 3 live right now, Show 4 upcoming.',
  kicker: 'THE COMPETITION',
  headline: 'FIVE NIGHTS. ONE WINNER.',
  subhead:
    'The journey to the Grand Finale. Track live battle results as our artists compete for the ultimate title.',
  shows: [
    {
      id: 'show-1',
      showNumber: 1,
      title: 'SHOW 1 • CALGARY',
      city: 'Calgary',
      venue: 'CALGARY STAMPEDE ARENA',
      dateText: 'OCT 28',
      status: 'completed',
      statusLabel: 'COMPLETED',
      winner: JACKSON_REED,
      contenders: [JACKSON_REED, ...SHOW_1_ELIMINATED],
      ticketUrl: '#schedule',
    },
    {
      id: 'show-2',
      showNumber: 2,
      title: 'SHOW 2 • HALIFAX',
      city: 'Halifax',
      venue: 'HALIFAX LIGHTHOUSE STAGE',
      dateText: 'NOV 04',
      status: 'completed',
      statusLabel: 'COMPLETED',
      winner: SARAH_VANCE,
      contenders: [SARAH_VANCE, ...SHOW_2_ELIMINATED],
      ticketUrl: '#schedule',
    },
    {
      id: 'show-3',
      showNumber: 3,
      title: 'SHOW 3 • TORONTO',
      city: 'Toronto',
      venue: 'MASSEY HALL',
      dateText: 'NOV 14',
      status: 'live',
      statusLabel: 'LIVE NOW',
      winner: null,
      contenders: [WYATT_STONE, CHLOE_JENKINS, LIAM_OCONNOR, RUBY_LANE],
      ticketUrl: '#schedule',
    },
    {
      id: 'show-4',
      showNumber: 4,
      title: 'SHOW 4 • VANCOUVER',
      city: 'Vancouver',
      venue: 'COMMODORE BALLROOM',
      dateText: 'NOV 21',
      status: 'upcoming',
      statusLabel: 'UPCOMING',
      winner: null,
      contenders: [
        createPendingContender(1),
        createPendingContender(2),
        createPendingContender(3),
        createPendingContender(4),
      ],
      ticketUrl: '#schedule',
    },
  ],
  grandFinale: {
    id: 'finale',
    title: 'GRAND FINALE',
    headline: 'AWAITING CHAMPIONS',
    dateText: 'DECEMBER 15 • NATIONAL BROADCAST',
    venue: 'NATIONAL BROADCAST CENTER',
    status: 'upcoming',
    statusLabel: 'AWAITING CHAMPIONS',
    finalists: [JACKSON_REED, SARAH_VANCE, null, null],
    winner: null,
  },
};

// -------------------------------------------------------------
// PRESET 2: PRE-TOURNAMENT (None of the shows or contestants chosen yet)
// -------------------------------------------------------------
export const PRESET_PRE_TOURNAMENT: TournamentStateData = {
  phaseKey: 'pending',
  phaseLabel: 'Auditions / Pending Selection',
  phaseDescription: 'Artists currently auditioning. Shows are scheduled, contestants pending.',
  kicker: 'THE AUDITIONS',
  headline: 'FIVE NIGHTS. ONE WINNER.',
  subhead:
    'Four qualifying stages across Canada. Contestants are being selected by the industry jury.',
  shows: [
    {
      id: 'show-1',
      showNumber: 1,
      title: 'SHOW 1 • CALGARY',
      city: 'Calgary',
      venue: 'CALGARY STAMPEDE ARENA',
      dateText: 'OCT 28',
      status: 'pending',
      statusLabel: 'PENDING SELECTION',
      winner: null,
      contenders: [
        createPendingContender(1),
        createPendingContender(2),
        createPendingContender(3),
        createPendingContender(4),
      ],
      ticketUrl: '#schedule',
    },
    {
      id: 'show-2',
      showNumber: 2,
      title: 'SHOW 2 • HALIFAX',
      city: 'Halifax',
      venue: 'HALIFAX LIGHTHOUSE STAGE',
      dateText: 'NOV 04',
      status: 'pending',
      statusLabel: 'PENDING SELECTION',
      winner: null,
      contenders: [
        createPendingContender(1),
        createPendingContender(2),
        createPendingContender(3),
        createPendingContender(4),
      ],
      ticketUrl: '#schedule',
    },
    {
      id: 'show-3',
      showNumber: 3,
      title: 'SHOW 3 • TORONTO',
      city: 'Toronto',
      venue: 'MASSEY HALL',
      dateText: 'NOV 14',
      status: 'pending',
      statusLabel: 'PENDING SELECTION',
      winner: null,
      contenders: [
        createPendingContender(1),
        createPendingContender(2),
        createPendingContender(3),
        createPendingContender(4),
      ],
      ticketUrl: '#schedule',
    },
    {
      id: 'show-4',
      showNumber: 4,
      title: 'SHOW 4 • VANCOUVER',
      city: 'Vancouver',
      venue: 'COMMODORE BALLROOM',
      dateText: 'NOV 21',
      status: 'pending',
      statusLabel: 'PENDING SELECTION',
      winner: null,
      contenders: [
        createPendingContender(1),
        createPendingContender(2),
        createPendingContender(3),
        createPendingContender(4),
      ],
      ticketUrl: '#schedule',
    },
  ],
  grandFinale: {
    id: 'finale',
    title: 'GRAND FINALE',
    headline: 'AWAITING CHAMPIONS',
    dateText: 'DECEMBER 15 • NATIONAL BROADCAST',
    venue: 'NATIONAL BROADCAST CENTER',
    status: 'pending',
    statusLabel: 'AWAITING CHAMPIONS',
    finalists: [null, null, null, null],
    winner: null,
  },
};

// -------------------------------------------------------------
// PRESET 3: LINEUP REVEALED (Contestants chosen, shows not started yet)
// -------------------------------------------------------------
export const PRESET_ALL_UPCOMING: TournamentStateData = {
  phaseKey: 'upcoming',
  phaseLabel: 'Lineup Announced (Upcoming)',
  phaseDescription: 'All 16 finalists revealed. Shows scheduled and ready to begin.',
  kicker: 'THE LINEUP',
  headline: 'FIVE NIGHTS. ONE WINNER.',
  subhead: 'Sixteen elite country artists revealed. Qualifying battles kick off this season.',
  shows: [
    {
      id: 'show-1',
      showNumber: 1,
      title: 'SHOW 1 • CALGARY',
      city: 'Calgary',
      venue: 'CALGARY STAMPEDE ARENA',
      dateText: 'OCT 28',
      status: 'upcoming',
      statusLabel: 'UPCOMING',
      winner: null,
      contenders: [
        { ...JACKSON_REED, status: 'scheduled' },
        { ...SHOW_1_ELIMINATED[0]!, status: 'scheduled' },
        { ...SHOW_1_ELIMINATED[1]!, status: 'scheduled' },
        { ...SHOW_1_ELIMINATED[2]!, status: 'scheduled' },
      ],
      ticketUrl: '#schedule',
    },
    {
      id: 'show-2',
      showNumber: 2,
      title: 'SHOW 2 • HALIFAX',
      city: 'Halifax',
      venue: 'HALIFAX LIGHTHOUSE STAGE',
      dateText: 'NOV 04',
      status: 'upcoming',
      statusLabel: 'UPCOMING',
      winner: null,
      contenders: [
        { ...SARAH_VANCE, status: 'scheduled' },
        { ...SHOW_2_ELIMINATED[0]!, status: 'scheduled' },
        { ...SHOW_2_ELIMINATED[1]!, status: 'scheduled' },
        { ...SHOW_2_ELIMINATED[2]!, status: 'scheduled' },
      ],
      ticketUrl: '#schedule',
    },
    {
      id: 'show-3',
      showNumber: 3,
      title: 'SHOW 3 • TORONTO',
      city: 'Toronto',
      venue: 'MASSEY HALL',
      dateText: 'NOV 14',
      status: 'upcoming',
      statusLabel: 'UPCOMING',
      winner: null,
      contenders: [
        { ...WYATT_STONE, status: 'scheduled' },
        { ...CHLOE_JENKINS, status: 'scheduled' },
        { ...LIAM_OCONNOR, status: 'scheduled' },
        { ...RUBY_LANE, status: 'scheduled' },
      ],
      ticketUrl: '#schedule',
    },
    {
      id: 'show-4',
      showNumber: 4,
      title: 'SHOW 4 • VANCOUVER',
      city: 'Vancouver',
      venue: 'COMMODORE BALLROOM',
      dateText: 'NOV 21',
      status: 'upcoming',
      statusLabel: 'UPCOMING',
      winner: null,
      contenders: SHOW_4_CONTENDERS,
      ticketUrl: '#schedule',
    },
  ],
  grandFinale: {
    id: 'finale',
    title: 'GRAND FINALE',
    headline: 'AWAITING CHAMPIONS',
    dateText: 'DECEMBER 15 • NATIONAL BROADCAST',
    venue: 'NATIONAL BROADCAST CENTER',
    status: 'upcoming',
    statusLabel: 'AWAITING CHAMPIONS',
    finalists: [null, null, null, null],
    winner: null,
  },
};

// -------------------------------------------------------------
// PRESET 4: QUALIFIERS COMPLETED (Final 4 Ready)
// -------------------------------------------------------------
export const PRESET_QUALIFIERS_COMPLETED: TournamentStateData = {
  phaseKey: 'qualifiers_completed',
  phaseLabel: 'Final 4 Ready',
  phaseDescription:
    'All 4 qualifying shows completed! The 4 Golden Ticket winners meet in the Finale.',
  kicker: 'THE FINAL FOUR',
  headline: 'FOUR QUALIFIERS. ONE CROWN.',
  subhead:
    'Jackson Reed, Sarah Vance, Wyatt Stone, and Brody Miller have clinched their spots for the ultimate live showdown.',
  shows: [
    {
      id: 'show-1',
      showNumber: 1,
      title: 'SHOW 1 • CALGARY',
      city: 'Calgary',
      venue: 'CALGARY STAMPEDE ARENA',
      dateText: 'OCT 28',
      status: 'completed',
      statusLabel: 'COMPLETED',
      winner: JACKSON_REED,
      contenders: [JACKSON_REED, ...SHOW_1_ELIMINATED],
      ticketUrl: '#schedule',
    },
    {
      id: 'show-2',
      showNumber: 2,
      title: 'SHOW 2 • HALIFAX',
      city: 'Halifax',
      venue: 'HALIFAX LIGHTHOUSE STAGE',
      dateText: 'NOV 04',
      status: 'completed',
      statusLabel: 'COMPLETED',
      winner: SARAH_VANCE,
      contenders: [SARAH_VANCE, ...SHOW_2_ELIMINATED],
      ticketUrl: '#schedule',
    },
    {
      id: 'show-3',
      showNumber: 3,
      title: 'SHOW 3 • TORONTO',
      city: 'Toronto',
      venue: 'MASSEY HALL',
      dateText: 'NOV 14',
      status: 'completed',
      statusLabel: 'COMPLETED',
      winner: { ...WYATT_STONE, status: 'winner', goldenTicketLabel: 'GOLDEN TICKET #3' },
      contenders: [
        { ...WYATT_STONE, status: 'winner', goldenTicketLabel: 'GOLDEN TICKET #3' },
        { ...CHLOE_JENKINS, status: 'eliminated' },
        { ...LIAM_OCONNOR, status: 'eliminated' },
        { ...RUBY_LANE, status: 'eliminated' },
      ],
      ticketUrl: '#schedule',
    },
    {
      id: 'show-4',
      showNumber: 4,
      title: 'SHOW 4 • VANCOUVER',
      city: 'Vancouver',
      venue: 'COMMODORE BALLROOM',
      dateText: 'NOV 21',
      status: 'completed',
      statusLabel: 'COMPLETED',
      winner: { ...SHOW_4_CONTENDERS[0]!, status: 'winner', goldenTicketLabel: 'GOLDEN TICKET #4' },
      contenders: [
        { ...SHOW_4_CONTENDERS[0]!, status: 'winner', goldenTicketLabel: 'GOLDEN TICKET #4' },
        { ...SHOW_4_CONTENDERS[1]!, status: 'eliminated' },
        { ...SHOW_4_CONTENDERS[2]!, status: 'eliminated' },
        { ...SHOW_4_CONTENDERS[3]!, status: 'eliminated' },
      ],
      ticketUrl: '#schedule',
    },
  ],
  grandFinale: {
    id: 'finale',
    title: 'GRAND FINALE',
    headline: 'FINAL 4 LOCKED IN',
    dateText: 'DECEMBER 15 • NATIONAL BROADCAST',
    venue: 'NATIONAL BROADCAST CENTER',
    status: 'live',
    statusLabel: 'STAGE SET',
    finalists: [
      JACKSON_REED,
      SARAH_VANCE,
      { ...WYATT_STONE, status: 'winner', goldenTicketLabel: 'GOLDEN TICKET #3' },
      { ...SHOW_4_CONTENDERS[0]!, status: 'winner', goldenTicketLabel: 'GOLDEN TICKET #4' },
    ],
    winner: null,
  },
};

// -------------------------------------------------------------
// PRESET 5: FINALE CHAMPION CROWNED
// -------------------------------------------------------------
export const PRESET_CHAMPION_CROWNED: TournamentStateData = {
  phaseKey: 'champion_crowned',
  phaseLabel: 'Champion Crowned',
  phaseDescription:
    'The Grand Finale has ended. The ultimate Canadian Country Star champion is crowned!',
  kicker: 'THE CHAMPION',
  headline: 'THE NEXT GREAT CANADIAN STAR',
  subhead: 'Congratulations to our winner Jackson Reed, crowned champion of the 2026 competition.',
  shows: PRESET_QUALIFIERS_COMPLETED.shows,
  grandFinale: {
    id: 'finale',
    title: 'GRAND FINALE',
    headline: 'CHAMPION CROWNED',
    dateText: 'DECEMBER 15 • NATIONAL BROADCAST',
    venue: 'NATIONAL BROADCAST CENTER',
    status: 'completed',
    statusLabel: 'CHAMPION CROWNED',
    finalists: PRESET_QUALIFIERS_COMPLETED.grandFinale.finalists,
    winner: JACKSON_REED,
  },
};

export const ALL_TOURNAMENT_PRESETS: TournamentStateData[] = [
  PRESET_ACTIVE_BATTLE,
  PRESET_PRE_TOURNAMENT,
  PRESET_ALL_UPCOMING,
  PRESET_QUALIFIERS_COMPLETED,
  PRESET_CHAMPION_CROWNED,
];
