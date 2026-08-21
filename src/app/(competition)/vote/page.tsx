import ArtistsRosterPage from '../artists/page';

export const metadata = {
  title: 'Vote for the Next Great Canadian Country Star',
  description:
    'Choose an eligible artist and verify your email to cast one vote in the public shortlist round.',
  alternates: { canonical: '/vote' },
};

export default function VotePage() {
  return <ArtistsRosterPage />;
}
