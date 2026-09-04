import { LegalPage } from '@/components/marketing/legal-page';

export const metadata = { title: 'Privacy Policy | Canadian Star' };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="How the competition team handles information shared by artists, voters, ticket buyers, and supporters."
    >
      <h2>Information we collect</h2>
      <p>
        We collect the information needed to run the competition, including artist application
        details, contact information, submitted media, voting email addresses, event enquiries, and
        newsletter preferences.
      </p>
      <h2>How we use information</h2>
      <p>
        Information is used to review applications, publish approved artist profiles, administer
        verified voting, communicate about competition events, provide support, and deliver updates
        where you have asked to receive them.
      </p>
      <h2>Sharing and retention</h2>
      <p>
        We share information only with people and service providers who help operate the
        competition, and only for that purpose. Artist information intended for a public profile is
        published after approval. We keep records for as long as reasonably necessary for
        competition administration, legal obligations, and accountability.
      </p>
      <h2>Your choices</h2>
      <p>
        You can ask to access, correct, or delete personal information, subject to legal and
        competition-record requirements. You can unsubscribe from optional marketing messages at any
        time.
      </p>
      <h2>Questions</h2>
      <p>
        For privacy questions, contact the competition team through the{' '}
        <a href="/contact">contact page</a>.
      </p>
    </LegalPage>
  );
}
