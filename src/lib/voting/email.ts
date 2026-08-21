import 'server-only';
import { renderVotingOtpEmail } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/send';

export async function sendVoteOtpEmail(input: { email: string; artistName: string; code: string }) {
  const rendered = renderVotingOtpEmail({
    artistName: input.artistName,
    code: input.code,
  });

  const result = await sendEmail({
    to: input.email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });

  if (!result.success && process.env.NODE_ENV === 'production') {
    throw new Error(result.error || 'Vote email delivery failed.');
  }
}
