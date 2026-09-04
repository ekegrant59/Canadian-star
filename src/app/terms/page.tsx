import { LegalPage } from '@/components/marketing/legal-page';

export const metadata = { title: 'Terms of Service | Canadian Star' };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="These terms describe the expectations for using the competition website and taking part in The Next Great Canadian Country Star."
    >
      <h2>Using the site</h2>
      <p>
        Use this site lawfully and provide information that is accurate, current, and yours to
        share. Do not interfere with the competition, attempt to bypass voting safeguards, or submit
        content that infringes another person&apos;s rights.
      </p>
      <h2>Artist applications</h2>
      <p>
        Submitting an application does not guarantee selection. The competition team may request
        clarification, verify eligibility, and make decisions under the published competition rules.
        Applications must include at least two recorded song links. The submitted music must be
        original country music written or co-written by the contestant; AI-generated music is
        forbidden. Contestants must also be available for all five competition dates. An approved
        profile may be edited by the artist, but changes are published only after review.
      </p>
      <h2>Media and public profiles</h2>
      <p>
        You must have permission to submit music, photographs, video, names, and other materials. By
        submitting them, you grant the competition team permission to review and use them for
        competition administration and promotion as described in the applicable release.
      </p>
      <h2>Events and voting</h2>
      <p>
        Event details, schedules, ticket availability, and voting windows may change. Voting is
        subject to the controls and eligibility requirements shown at the time of voting.
      </p>
      <h2>Contact</h2>
      <p>
        Questions about these terms can be sent through the <a href="/contact">contact page</a>.
      </p>
    </LegalPage>
  );
}
