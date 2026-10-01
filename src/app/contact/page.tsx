import { Mail, MapPin } from 'lucide-react';
import { LegalPage } from '@/components/marketing/legal-page';

export const metadata = { title: 'Contact | Canadian Star' };

export default function ContactPage() {
  return (
    <LegalPage
      title="Contact the Competition Team"
      intro="Questions about applying, attending a show, partnerships, or an artist profile? We would be glad to hear from you."
    >
      <div className="legal-contact-grid">
        <a href="mailto:backstage@hellion-entertainment.com" className="legal-contact-card">
          <Mail aria-hidden="true" />
          <h2>General enquiries</h2>
          <p>backstage@hellion-entertainment.com</p>
        </a>
        <div className="legal-contact-card">
          <MapPin aria-hidden="true" />
          <h2>Competition region</h2>
          <p>Ontario, Canada</p>
        </div>
      </div>
      <h2>What to include</h2>
      <p>
        For an application question, include the artist or band name and the email used for the
        application. For an event question, include the show date or ticket order details. Please do
        not send passwords or sensitive payment information by email.
      </p>
    </LegalPage>
  );
}
