import 'server-only';
import {
  renderArtistApplicationStageEmail,
  renderVotingOtpEmail,
  renderVoteConfirmedEmail,
  renderFinal16AnnouncementEmail,
  renderCustomBroadcastEmail,
} from './templates';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  devMode?: boolean;
}

/**
 * Universal email dispatcher.
 * Uses Brevo exclusively. Development can simulate delivery when the key is
 * absent; production fails closed so a successful action never implies that
 * an email was delivered when Brevo is not configured.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const {
    to,
    subject,
    html,
    text,
    from = process.env.EMAIL_FROM || 'Canadian Country Star <noreply@canadianstar.ca>',
  } = options;

  const brevoKey = process.env.BREVO_API_KEY;
  const recipients = Array.isArray(to) ? to : [to];

  if (!brevoKey) {
    if (process.env.NODE_ENV === 'production') {
      return { success: false, error: 'BREVO_API_KEY is not configured.' };
    }
    console.log(`\n========================================`);
    console.log(`[EMAIL DISPATCH - DEV SIMULATION]`);
    console.log(`From: ${from}`);
    console.log(`To: ${recipients.join(', ')}`);
    console.log(`Subject: ${subject}`);
    console.log(`----------------------------------------`);
    console.log(text || html.slice(0, 300) + '...');
    console.log(`========================================\n`);

    return {
      success: true,
      messageId: `dev-sim-${Date.now()}`,
      devMode: true,
    };
  }

  try {
    const messageIds: string[] = [];
    for (const email of recipients) {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: parseSender(from),
          to: [{ email }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
      });
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[email] Brevo error (${response.status}):`, errorBody);
        return { success: false, error: `Brevo returned status ${response.status}` };
      }
      const data = (await response.json()) as { messageId?: string };
      if (data.messageId) messageIds.push(data.messageId);
    }
    return {
      success: true,
      messageId: messageIds.join(','),
    };
  } catch (error) {
    console.error('[email] Delivery failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown email dispatch error',
    };
  }
}

function parseSender(value: string): { name: string; email: string } {
  const match = value.match(/^(.*?)\s*<([^>]+)>$/);
  return match
    ? { name: match[1]!.trim(), email: match[2]!.trim() }
    : { name: process.env.EMAIL_SENDER_NAME || 'Canadian Country Star', email: value.trim() };
}

/**
 * Sends a test email for any template from the Admin Email Studio.
 */
export async function sendTestEmailAction(input: {
  toEmail: string;
  templateId: string;
  customSubject?: string;
  customHeadline?: string;
  customBodyHtml?: string;
  customCtaText?: string;
  customCtaUrl?: string;
}): Promise<SendEmailResult> {
  const {
    toEmail,
    templateId,
    customSubject,
    customHeadline,
    customBodyHtml,
    customCtaText,
    customCtaUrl,
  } = input;

  let rendered: { subject: string; html: string; text: string };

  switch (templateId) {
    case 'artist_application_status':
      rendered = renderArtistApplicationStageEmail({
        artistName: 'Elena Rostova',
        actName: 'Elena Rostova Band',
        status: 'approved',
      });
      break;
    case 'voting_otp':
      rendered = renderVotingOtpEmail({
        artistName: 'Elena Rostova',
        code: '482915',
      });
      break;
    case 'vote_confirmed':
      rendered = renderVoteConfirmedEmail({
        artistName: 'Elena Rostova',
        artistGenre: 'Classical Crossover',
      });
      break;
    case 'final_16_reveal':
      rendered = renderFinal16AnnouncementEmail({
        artistName: 'Valued Supporter',
      });
      break;
    case 'custom_broadcast':
    default:
      rendered = renderCustomBroadcastEmail({
        headline: customHeadline || customSubject || 'Important Competition Update',
        bodyHtml: customBodyHtml || '<p>This is a custom broadcast message to artists.</p>',
        ctaText: customCtaText,
        ctaUrl: customCtaUrl,
      });
      break;
  }

  return sendEmail({
    to: toEmail,
    subject: customSubject || `[TEST] ${rendered.subject}`,
    html: rendered.html,
    text: rendered.text,
  });
}
