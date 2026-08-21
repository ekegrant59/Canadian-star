import { escapeHtml, wrapInEmailLayout } from '../layout';
import type {
  ArtistApplicationReceivedEmailProps,
  ArtistApplicationApprovedEmailProps,
  ArtistApplicationRejectedEmailProps,
  ArtistApplicationStageEmailProps,
  VotingOtpEmailProps,
  VoteConfirmedEmailProps,
  Final16AnnouncementEmailProps,
  FinalCallForVotesEmailProps,
  CustomBroadcastEmailProps,
} from '../types';

const SITE_URL = (
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://canadianstar.ca'
).replace(/\/+$/, '');

/**
 * 1. Artist Application Received
 * Matches top of "Artist Email_ Application Status.svg"
 */
export function renderArtistApplicationReceivedEmail(props: ArtistApplicationReceivedEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const { artistName, dashboardUrl = `${SITE_URL}/artist` } = props;
  const subject = 'Application Received : The Next Great Canadian Country Star';
  const heroHeadline = 'APPLICATION RECEIVED';
  const heroCategory = 'APPLICATION STATUS';

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 24px; color: #E5E2E1;">
      Hello <strong>${escapeHtml(artistName)}</strong>,
    </p>
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #C8C6C5;">
      Thank you for submitting your application to The Next Great Canadian Country Star. Your application has been successfully received and will be reviewed by our production team.
    </p>
    <div style="background-color: #232222; border: 1px solid #333130; border-radius: 4px; padding: 16px; margin: 20px 0 8px 0;">
      <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #FF9B70; text-transform: uppercase;">
        APPLICATION STATUS
      </p>
      <p style="margin: 0; font-size: 13px; color: #D1CFCD;">
        Your submission is currently queued for initial judging review. You will receive an email notification once your audition materials have been evaluated.
      </p>
    </div>
  `;

  const html = wrapInEmailLayout({
    title: subject,
    previewText: 'Your audition application has been received and queued for review.',
    heroHeadline,
    heroCategory,
    heroImageUrl:
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80',
    contentHtml,
    ctaText: 'VIEW MY APPLICATION',
    ctaUrl: dashboardUrl,
  });

  const text = `Hello ${artistName},\n\nThank you for submitting your application to The Next Great Canadian Country Star. Your application has been successfully received and will be reviewed by our production team.\n\nView your application status here: ${dashboardUrl}\n\nCanadian Country Star`;

  return { subject, html, text };
}

/**
 * 2. Artist Application Approved
 * Matches bottom of "Artist Email_ Application Status.svg"
 */
export function renderArtistApplicationApprovedEmail(props: ArtistApplicationApprovedEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    artistName,
    actName = artistName,
    dashboardUrl = `${SITE_URL}/artist`,
    nextStageName = 'Qualifying Live Broadcasts',
  } = props;

  const subject = 'Congratulations : Your Application Has Been Approved';
  const heroHeadline = 'YOUR APPLICATION HAS BEEN APPROVED';
  const heroCategory = 'STATUS UPDATE';

  const contentHtml = `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
      <tr>
        <td valign="top" width="28" style="padding-right: 12px;">
          <div style="width: 24px; height: 24px; border-radius: 50%; background-color: #FF5C00; color: #FFFFFF; font-size: 13px; font-weight: bold; text-align: center; line-height: 24px;">
            &#9733;
          </div>
        </td>
        <td valign="top" style="font-size: 14px; line-height: 22px; color: #E5E2E1;">
          <strong>Congratulations ${escapeHtml(artistName)}!</strong> Your application for <strong>${escapeHtml(actName)}</strong> has been approved and you are eligible to continue to the next phase of the competition.
        </td>
      </tr>
    </table>

    <div style="background-color: #232222; border: 1px solid #333130; border-radius: 4px; padding: 16px; margin: 16px 0 8px 0;">
      <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #FF9B70; text-transform: uppercase;">
        NEXT STEPS
      </p>
      <p style="margin: 0; font-size: 13px; line-height: 20px; color: #D1CFCD;">
        Please access your artist dashboard to review your stage assignment for the ${escapeHtml(nextStageName)}, confirm your performance date availability, and finalize your public profile details.
      </p>
    </div>
  `;

  const html = wrapInEmailLayout({
    title: subject,
    previewText: 'Congratulations! Your application has been approved for the next phase.',
    heroHeadline,
    heroCategory,
    heroImageUrl:
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80',
    contentHtml,
    ctaText: 'VIEW MY DASHBOARD',
    ctaUrl: dashboardUrl,
  });

  const text = `Congratulations ${artistName}!\n\nYour application for ${actName} has been approved and you are eligible to continue to the next phase of the competition.\n\nPlease access your artist dashboard to view your status and get live updates:\n${dashboardUrl}\n\nCanadian Country Star`;

  return { subject, html, text };
}

/**
 * 3. Artist Application Status Update / Rejection
 */
export function renderArtistApplicationRejectedEmail(props: ArtistApplicationRejectedEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const { artistName, competitionUrl = `${SITE_URL}/artists` } = props;
  const subject = 'Application Update : The Next Great Canadian Country Star';
  const heroHeadline = 'APPLICATION STATUS UPDATE';
  const heroCategory = 'STATUS UPDATE';

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 24px; color: #E5E2E1;">
      Hello <strong>${escapeHtml(artistName)}</strong>,
    </p>
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #C8C6C5;">
      Thank you for your audition and passion for Canadian country music. After a thorough review by our selection committee, your application was not chosen for the Final 16 qualifying broadcast shows this season.
    </p>
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #C8C6C5;">
      The talent pool across the country was extraordinarily strong this year. We encourage you to keep writing, performing, and sharing your music.
    </p>
    <div style="background-color: #232222; border: 1px solid #333130; border-radius: 4px; padding: 16px; margin: 16px 0 8px 0;">
      <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #FF9B70; text-transform: uppercase;">
        STAY CONNECTED
      </p>
      <p style="margin: 0; font-size: 13px; line-height: 20px; color: #D1CFCD;">
        You are invited to follow the competition, discover new artist releases, and participate in fan voting throughout the season.
      </p>
    </div>
  `;

  const html = wrapInEmailLayout({
    title: subject,
    previewText: 'Status update regarding your Canadian Country Star application.',
    heroHeadline,
    heroCategory,
    heroImageUrl:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
    contentHtml,
    ctaText: 'EXPLORE THE COMPETITION',
    ctaUrl: competitionUrl,
  });

  const text = `Hello ${artistName},\n\nThank you for your audition. After review by our selection committee, your application was not chosen for the Final 16 qualifying shows this season.\n\nWe encourage you to continue creating music and follow the competition:\n${competitionUrl}\n\nCanadian Country Star`;

  return { subject, html, text };
}

export function renderArtistApplicationStageEmail(props: ArtistApplicationStageEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const { artistName, actName = artistName, status, dashboardUrl = `${SITE_URL}/artist` } = props;
  const details = {
    submitted: {
      label: 'APPLICATION RECEIVED',
      title: 'Your application has been received',
      message: 'Your application has been received and is ready for the review team.',
    },
    under_review: {
      label: 'APPLICATION UNDER REVIEW',
      title: 'Your application is being reviewed',
      message: 'The review team is assessing your submitted information and performance materials.',
    },
    approved: {
      label: 'APPLICATION APPROVED',
      title: 'Your application has been approved',
      message:
        'Your application has been approved and you are eligible to continue in the competition.',
    },
    rejected: {
      label: 'APPLICATION UPDATE',
      title: 'Your application status has changed',
      message:
        'Your application is not moving forward in the current competition process. Thank you for sharing your work with us.',
    },
    shortlisted: {
      label: 'FINAL 16 SELECTION',
      title: 'You are in the Final 16',
      message:
        'Your application has advanced to the Final 16. Further competition and qualifying-show information will appear in your artist dashboard.',
    },
    finalist: {
      label: 'FINAL 4 SELECTION',
      title: 'You are in the Final 4',
      message:
        'Your application has advanced to the Final 4. Keep checking your artist dashboard for the next production instructions.',
    },
  }[status];
  const subject = `${details.title} : Canadian Country Star`;
  const contentHtml = `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#E5E2E1;">Hello <strong>${escapeHtml(artistName)}</strong>,</p><p style="margin:0 0 16px;font-size:14px;line-height:22px;color:#C8C6C5;">${escapeHtml(details.message)}</p><div style="background-color:#232222;border:1px solid #333130;border-radius:4px;padding:16px;margin:16px 0;"><p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.5px;color:#FF9B70;text-transform:uppercase;">CURRENT STATUS</p><p style="margin:0;font-size:13px;line-height:20px;color:#D1CFCD;">${escapeHtml(details.label)} · ${escapeHtml(actName)}</p></div>`;
  const html = wrapInEmailLayout({
    title: subject,
    previewText: details.message,
    heroHeadline: details.label,
    heroCategory: 'APPLICATION STATUS',
    heroImageUrl:
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80',
    contentHtml,
    ctaText: 'VIEW MY DASHBOARD',
    ctaUrl: dashboardUrl,
  });
  const text = `Hello ${artistName},\n\n${details.message}\n\nCurrent status: ${details.label}\n\nView your dashboard: ${dashboardUrl}\n\nCanadian Country Star`;
  return { subject, html, text };
}

/**
 * 4. Voting Verification Code (OTP)
 * Matches top of "Email - Voting Verification Code.svg"
 */
export function renderVotingOtpEmail(props: VotingOtpEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const { artistName, code, votingUrl = `${SITE_URL}/vote` } = props;
  const subject = `Verify your vote for ${artistName}`;
  const heroHeadline = 'VERIFY YOUR VOTE';
  const heroCategory = 'AUTHENTICATION';

  // Format code with space in middle if 6 digits
  const formattedCode = code.length === 6 ? `${code.slice(0, 3)}  ${code.slice(3)}` : code;

  const contentHtml = `
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; text-align: center; color: #D1CFCD;">
      Enter the code below on the competition website to complete your vote for <strong style="color: #FFFFFF;">${escapeHtml(artistName)}</strong>.
    </p>

    <!-- Large Monospace OTP Digits Box -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 16px 0 24px 0;">
      <tr>
        <td align="center">
          <div style="display: inline-block; background-color: #272524; border: 1px solid #3D3937; border-radius: 6px; padding: 16px 32px;">
            <span style="font-family: 'Courier New', Courier, monospace, Georgia, serif; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #FFFFFF; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
              ${escapeHtml(formattedCode)}
            </span>
          </div>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 8px 0; font-size: 12px; line-height: 18px; text-align: center; color: #8F8D8B;">
      This verification code is valid for 10 minutes and can only be used once.
    </p>
  `;

  const html = wrapInEmailLayout({
    title: subject,
    previewText: `Your verification code is ${code} to vote for ${artistName}.`,
    heroHeadline,
    heroCategory,
    heroImageUrl:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
    contentHtml,
    ctaText: 'BACK TO VOTING',
    ctaUrl: votingUrl,
    securityNotice: 'If you did not request this verification code, please ignore this email.',
  });

  const text = `Verify your vote for ${artistName}\n\nYour 6-digit verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nComplete your vote here: ${votingUrl}\n\nIf you did not request this code, please ignore this message.\n\nCanadian Country Star`;

  return { subject, html, text };
}

/**
 * 5. Vote Verified & Confirmed
 * Matches middle of "Email - Voting Verification Code.svg"
 */
export function renderVoteConfirmedEmail(props: VoteConfirmedEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    artistName,
    artistGenre = 'Canadian Country',
    artistImageUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    artistProfileUrl = `${SITE_URL}/artists`,
    shareUrl = `${SITE_URL}/vote`,
  } = props;

  const subject = `Vote Confirmed : Thank You for Supporting ${artistName}`;
  const heroHeadline = 'YOUR VOICE HAS BEEN HEARD';
  const heroCategory = 'VOTE CONFIRMED SUCCESSFULLY';

  const contentHtml = `
    <!-- Artist Spotlight Card -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #232222; border: 1px solid #333130; border-radius: 6px; margin-bottom: 20px;">
      <tr>
        <td style="padding: 16px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="72" valign="middle" style="padding-right: 16px;">
                <img src="${artistImageUrl}" alt="${escapeHtml(artistName)}" width="72" height="72" style="display: block; width: 72px; height: 72px; border-radius: 6px; object-fit: cover; border: 1px solid #44413F;" />
              </td>
              <td valign="middle">
                <p style="margin: 0 0 4px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 18px; font-weight: 700; color: #FFFFFF;">
                  ${escapeHtml(artistName)}
                </p>
                <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; letter-spacing: 1px; color: #FF9B70; text-transform: uppercase;">
                  ${escapeHtml(artistGenre)}
                </p>
                <p style="margin: 0; font-size: 13px; line-height: 18px; color: #BDBAB7;">
                  Thank you for supporting ${escapeHtml(artistName)} in the Canadian Country Star competition. The winner will be announced live on the grand finale.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 13px; line-height: 20px; text-align: center; color: #A6A3A0;">
      Your vote has been verified and securely recorded in our audit tally. Invite friends to vote and rally support for your favorite artist.
    </p>
  `;

  const html = wrapInEmailLayout({
    title: subject,
    previewText: `Your vote for ${artistName} is confirmed!`,
    heroHeadline,
    heroCategory,
    heroImageUrl:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
    contentHtml,
    ctaText: 'VIEW ARTIST PROFILE',
    ctaUrl: artistProfileUrl,
    secondaryCtaText: 'SHARE YOUR VOTE',
    secondaryCtaUrl: shareUrl,
  });

  const text = `Your Voice Has Been Heard!\n\nYour vote for ${artistName} has been confirmed.\n\nThank you for supporting Canadian country music. The winner will be announced live.\n\nView profile: ${artistProfileUrl}\n\nCanadian Country Star`;

  return { subject, html, text };
}

/**
 * 6. Meet The Final 16 Announcement
 */
export function renderFinal16AnnouncementEmail(props: Final16AnnouncementEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const { artistName, finalistsUrl = `${SITE_URL}/#finalists-roster` } = props;
  const subject = 'Meet The Final 16 : The Journey Begins';
  const heroHeadline = 'MEET THE FINAL 16';
  const heroCategory = 'COMPETITION ANNOUNCEMENT';

  const greeting = artistName
    ? `<p style="margin: 0 0 16px 0; font-size: 15px; color: #E5E2E1;">Hello <strong>${escapeHtml(artistName)}</strong>,</p>`
    : '';

  const contentHtml = `
    ${greeting}
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #D1CFCD;">
      The judges have made their official decision. 16 exceptional country artists across Canada have qualified for the live broadcast qualifying shows.
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; color: #D1CFCD;">
      Explore the roster across all 4 qualifying shows, watch their audition performances, and get ready to cast your vote when the voting window opens.
    </p>
    <div style="background-color: #232222; border: 1px solid #333130; border-radius: 4px; padding: 16px; margin: 16px 0 8px 0;">
      <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #FF9B70; text-transform: uppercase;">
        4 QUALIFYING SHOWS : 1 GRAND FINALE
      </p>
      <p style="margin: 0; font-size: 13px; line-height: 20px; color: #D1CFCD;">
        4 artists per qualifying show will compete for viewer votes. The top artist from each show advances to the Grand Final.
      </p>
    </div>
  `;

  const html = wrapInEmailLayout({
    title: subject,
    previewText: 'The Final 16 country artists have been announced! Explore the roster.',
    heroHeadline,
    heroCategory,
    heroImageUrl:
      'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1200&q=80',
    contentHtml,
    ctaText: 'EXPLORE THE FINAL 16',
    ctaUrl: finalistsUrl,
  });

  const text = `Meet The Final 16 : The Journey Begins\n\nThe judges have made their decision. 16 exceptional country artists across Canada have qualified for the live broadcast shows.\n\nExplore the finalists here: ${finalistsUrl}\n\nCanadian Country Star`;

  return { subject, html, text };
}

/**
 * 7. Final Call For Votes
 * Matches bottom of "Email - Voting Verification Code.svg"
 */
export function renderFinalCallForVotesEmail(props: FinalCallForVotesEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const { votingUrl = `${SITE_URL}/vote`, hoursRemaining = 24 } = props;
  const subject = `Final Call For Votes : Voting Closes in ${hoursRemaining} Hours`;
  const heroHeadline = 'FINAL CALL FOR VOTES';
  const heroCategory = 'VOTING DEADLINE';

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 24px; text-align: center; color: #FFFFFF;">
      Don't miss your chance to shape the competition.
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; text-align: center; color: #D1CFCD;">
      The active voting phase closes in <strong>${hoursRemaining} hours</strong>. Cast your vote now to support your favorite artist and help decide who advances to the next stage.
    </p>
    <div style="background-color: #232222; border: 1px solid #333130; border-radius: 4px; padding: 14px; text-align: center; margin: 16px 0 8px 0;">
      <p style="margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 1px; color: #FF9B70; text-transform: uppercase;">
        ONE VOTE PER VERIFIED EMAIL ADDRESS
      </p>
    </div>
  `;

  const html = wrapInEmailLayout({
    title: subject,
    previewText: `Final call: Voting closes in ${hoursRemaining} hours!`,
    heroHeadline,
    heroCategory,
    heroImageUrl:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
    contentHtml,
    ctaText: 'VOTE NOW',
    ctaUrl: votingUrl,
  });

  const text = `Final Call For Votes\n\nDon't miss your chance to shape the competition. Cast your final votes before the deadline.\n\nVote now: ${votingUrl}\n\nCanadian Country Star`;

  return { subject, html, text };
}

/**
 * 8. Admin Vote Flag Alert
 */
// export function renderAdminVoteFlagAlertEmail(
//   props: AdminVoteFlagAlertEmailProps,
// ): { subject: string; html: string; text: string } {
//   const { voteId, voterEmail, ipAddress, flagRule, severity, reviewUrl } = props;
//   const subject = `[ALERT] Vote Integrity Flag : ${voteId} (${severity} Severity)`;
//   const heroHeadline = 'VOTE INTEGRITY ALERT';
//   const heroCategory = 'SECURITY AUDIT';

//   const contentHtml = `
//     <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #E5E2E1;">
//       A potential voting integrity anomaly has been detected and flagged for administrative review.
//     </p>
//     <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #232222; border: 1px solid #333130; border-radius: 4px; margin-bottom: 20px;">
//       <tr>
//         <td style="padding: 16px;">
//           <p style="margin: 0 0 8px 0; font-size: 12px; color: #9C9895;">
//             <strong>Vote ID:</strong> <span style="font-family: monospace; color: #FFFFFF;">${escapeHtml(voteId)}</span>
//           </p>
//           <p style="margin: 0 0 8px 0; font-size: 12px; color: #9C9895;">
//             <strong>Voter Email:</strong> <span style="color: #FFFFFF;">${escapeHtml(voterEmail)}</span>
//           </p>
//           <p style="margin: 0 0 8px 0; font-size: 12px; color: #9C9895;">
//             <strong>IP Address:</strong> <span style="font-family: monospace; color: #FFFFFF;">${escapeHtml(ipAddress)}</span>
//           </p>
//           <p style="margin: 0 0 8px 0; font-size: 12px; color: #9C9895;">
//             <strong>Triggered Rule:</strong> <span style="color: #FF9B70;">${escapeHtml(flagRule)}</span>
//           </p>
//           <p style="margin: 0; font-size: 12px; color: #9C9895;">
//             <strong>Severity:</strong> <span style="color: ${severity === 'High' ? '#F04438' : '#F79009'}; font-weight: bold;">${escapeHtml(severity)}</span>
//           </p>
//         </td>
//       </tr>
//     </table>
//   `;

//   const html = wrapInEmailLayout({
//     title: subject,
//     previewText: `Vote integrity alert: ${voteId} flagged under rule ${flagRule}.`,
//     heroHeadline,
//     heroCategory,
//     heroImageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
//     contentHtml,
//     ctaText: 'REVIEW IN ADMIN DOSSIER',
//     ctaUrl: reviewUrl,
//   });

//   const text = `Vote Integrity Alert\n\nVote ID: ${voteId}\nVoter: ${voterEmail}\nIP: ${ipAddress}\nRule: ${flagRule}\nSeverity: ${severity}\n\nReview dossier: ${reviewUrl}\n\nCanadian Country Star Admin`;

//   return { subject, html, text };
// }

/**
 * 9. Custom Broadcast Email (from Admin WYSIWYG Editor)
 */
export function renderCustomBroadcastEmail(props: CustomBroadcastEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    headline,
    category = 'OFFICIAL BROADCAST',
    bodyHtml,
    ctaText,
    ctaUrl,
    heroImageUrl,
  } = props;

  const subject = headline;
  const heroHeadline = headline.toUpperCase();

  const html = wrapInEmailLayout({
    title: subject,
    previewText: headline,
    heroHeadline,
    heroCategory: category,
    heroImageUrl,
    contentHtml: bodyHtml,
    ctaText,
    ctaUrl,
  });

  // Extract clean text from HTML
  const cleanText = bodyHtml
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const text = `${headline}\n\n${cleanText}\n\n${ctaText && ctaUrl ? `${ctaText}: ${ctaUrl}\n\n` : ''}Canadian Country Star`;

  return { subject, html, text };
}
