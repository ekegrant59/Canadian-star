import { LegalPage } from '@/components/marketing/legal-page';

export const metadata = { title: 'Competition Rules | Canadian Star' };

export default function RulesPage() {
  return (
    <LegalPage
      title="Competition Rules"
      intro="A plain-language overview of how artists are considered through the five-show Canadian country music competition."
    >
      <h2>Who can apply</h2>
      <p>
        The competition is intended for emerging and unsigned country artists based in Ontario. Solo
        artists, duos, and bands may apply, subject to the eligibility questions and requirements in
        the application.
      </p>
      <h2>Application and review</h2>
      <p>
        Artists submit a profile, biography, contact details, photographs, social links, performance
        video where available, recorded music links, availability, and required confirmations. The
        review team may assess vocal ability, musicianship, stage presence, originality, commercial
        readiness, and the quality of submitted material.
      </p>
      <h2>Competition path</h2>
      <p>
        Approved artist profiles may take part in verified public voting. The strongest candidates
        move to industry review, with up to 16 artists selected for four qualifying shows. One
        artist from each qualifying show advances to the Grand Final.
      </p>
      <h2>Availability and conduct</h2>
      <p>
        Artists must be available for all required competition dates and follow venue, production,
        and conduct requirements. The competition team may remove an entry that is ineligible,
        misleading, unsafe, or inconsistent with these rules.
      </p>
      <h2>Changes to an approved profile</h2>
      <p>
        Artists may update their information after approval. Each update is reviewed before it
        replaces the public profile.
      </p>
    </LegalPage>
  );
}
