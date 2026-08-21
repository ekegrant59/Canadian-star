import { EmailLayoutProps } from './types';
import { SITE_URL } from '@/config/site-url';

const EMAIL_BASE_URL = (process.env.BETTER_AUTH_URL || SITE_URL).replace(/\/+$/, '');
const VERIFIED_ROUTE_PREFIXES = [
  '/vote',
  '/artists',
  '/artist',
  '/apply',
  '/newsletter/',
  '/auth/',
  '/admin/',
];

function toVerifiedEmailUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const candidate =
      value.startsWith('http://') || value.startsWith('https://')
        ? new URL(value)
        : new URL(value.startsWith('/') ? value : `/${value}`, EMAIL_BASE_URL);
    const base = new URL(EMAIL_BASE_URL);
    if (
      candidate.origin !== base.origin ||
      (candidate.pathname !== '/' &&
        !VERIFIED_ROUTE_PREFIXES.some(
          (prefix) => candidate.pathname === prefix || candidate.pathname.startsWith(prefix),
        ))
    )
      return undefined;
    return `${EMAIL_BASE_URL}${candidate.pathname}${candidate.search}${candidate.hash}`;
  } catch {
    return undefined;
  }
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case "'":
        return '&#39;';
      case '"':
        return '&quot;';
      default:
        return char;
    }
  });
}

/**
 * Standard cross-client HTML email layout.
 *
 * Rules:
 * - 600px max width centered table
 * - Dark theme: #131313 body, #1C1B1B card, #2A2A2A borders
 * - Accent: #FF5C00 vibrant orange buttons
 * - Clean Canadian Country Star branding (No "Cinematic Frontier" header)
 */
export function wrapInEmailLayout(props: EmailLayoutProps): string {
  const {
    title,
    previewText = '',
    heroCategory = '',
    heroHeadline,
    heroImageUrl,
    contentHtml,
    ctaText,
    ctaUrl,
    secondaryCtaText,
    secondaryCtaUrl,
    securityNotice,
    hideHeroImage = false,
  } = props;

  const absoluteCtaUrl = toVerifiedEmailUrl(ctaUrl);
  const absoluteSecondaryCtaUrl = toVerifiedEmailUrl(secondaryCtaUrl);

  const defaultHeroBg =
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80';
  const heroImage = heroImageUrl || defaultHeroBg;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(title)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      background-color: #131313;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #E5E2E1;
    }
    table, td {
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
    }
    a {
      color: #FF5C00;
      text-decoration: none;
    }
    @media only screen and (max-width: 620px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
      }
      .fluid-padding {
        padding-left: 16px !important;
        padding-right: 16px !important;
      }
      .mobile-headline {
        font-size: 22px !important;
        line-height: 28px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #131313; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  ${
    previewText
      ? `<div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all; font-family: sans-serif;">
          ${escapeHtml(previewText)}
        </div>`
      : ''
  }

  <!-- Outer Background Table -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #131313; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 24px 12px 40px 12px;">

        <!-- Main Email Container (600px max) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; background-color: #131313; border: 1px solid #332822; border-radius: 6px; overflow: hidden;">
          
          <!-- Top Clean Header (No Cinematic Frontier) -->
          <tr>
            <td align="center" style="padding: 20px 24px; background-color: #131313; border-bottom: 1px solid #26201D;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="font-size: 11px; font-weight: 700; letter-spacing: 2.5px; color: #FF9B70; text-transform: uppercase;">
                    CANADIAN COUNTRY STAR
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${
            !hideHeroImage
              ? `<!-- Hero Banner Section -->
          <tr>
            <td align="center" style="background-color: #1a1817; position: relative;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="background-image: linear-gradient(180deg, rgba(19, 19, 19, 0.4) 0%, rgba(19, 19, 19, 0.95) 100%), url('${heroImage}'); background-size: cover; background-position: center; padding: 48px 24px 32px 24px;" class="fluid-padding">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      ${
                        heroCategory
                          ? `<tr>
                        <td align="center" style="font-size: 10px; font-weight: 800; letter-spacing: 2px; color: #FFB59A; text-transform: uppercase; padding-bottom: 8px;">
                          ${escapeHtml(heroCategory)}
                        </td>
                      </tr>`
                          : ''
                      }
                      <tr>
                        <td align="center" class="mobile-headline" style="font-family: Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: 700; line-height: 32px; color: #FFFFFF; text-transform: uppercase; letter-spacing: 1px;">
                          ${escapeHtml(heroHeadline)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
              : ''
          }

          <!-- Content Card Body -->
          <tr>
            <td style="padding: 24px;" class="fluid-padding">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1C1B1B; border: 1px solid #2A2A2A; border-radius: 4px;">
                <tr>
                  <td style="padding: 28px 24px;" class="fluid-padding">
                    
                    <!-- Inner Content -->
                    <div style="font-size: 14px; line-height: 22px; color: #D1CFCD;">
                      ${contentHtml}
                    </div>

                    ${
                      ctaText && absoluteCtaUrl
                        ? `<!-- Primary CTA Button -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px;">
                      <tr>
                        <td align="center">
                          <a href="${absoluteCtaUrl}" target="_blank" style="display: block; width: 100%; box-sizing: border-box; background-color: #FF5C00; color: #FFFFFF; font-size: 13px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; text-align: center; padding: 14px 20px; border-radius: 4px; text-decoration: none; border: 1px solid #FF5C00;">
                            ${escapeHtml(ctaText)}
                          </a>
                        </td>
                      </tr>
                    </table>`
                        : ''
                    }

                    ${
                      secondaryCtaText && absoluteSecondaryCtaUrl
                        ? `<!-- Secondary CTA Button -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 12px;">
                      <tr>
                        <td align="center">
                          <a href="${absoluteSecondaryCtaUrl}" target="_blank" style="display: block; width: 100%; box-sizing: border-box; background-color: transparent; color: #FF9B70; font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; text-align: center; padding: 12px 20px; border-radius: 4px; text-decoration: none; border: 1px solid #4A3B34;">
                            ${escapeHtml(secondaryCtaText)}
                          </a>
                        </td>
                      </tr>
                    </table>`
                        : ''
                    }

                  </td>
                </tr>
              </table>

              ${
                securityNotice
                  ? `<!-- Security Notice Box -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px;">
                <tr>
                  <td align="center" style="padding: 12px 16px; background-color: #171616; border: 1px solid #242424; border-radius: 4px; font-size: 12px; line-height: 18px; color: #8F8D8B;">
                    <span style="display: inline-block; margin-right: 6px;">&#128274;</span>
                    ${escapeHtml(securityNotice)}
                  </td>
                </tr>
              </table>`
                  : ''
              }

            </td>
          </tr>

          <!-- Footer Section -->
          <tr>
            <td align="center" style="padding: 24px 20px; background-color: #101010; border-top: 1px solid #221C19;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #B38F80; text-transform: uppercase; padding-bottom: 12px;">
                    CANADIAN COUNTRY STAR
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-size: 11px; color: #73706E; padding-bottom: 12px;">
                    <a href="${EMAIL_BASE_URL}/artists" target="_blank" style="color: #8C8885; text-decoration: underline; margin: 0 8px;">Artist Directory</a> &bull;
                    <a href="${EMAIL_BASE_URL}/vote" target="_blank" style="color: #8C8885; text-decoration: underline; margin: 0 8px;">Voting</a> &bull;
                    <a href="${EMAIL_BASE_URL}/apply" target="_blank" style="color: #8C8885; text-decoration: underline; margin: 0 8px;">Apply</a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-size: 10px; color: #575553;">
                    &copy; 2026 Canadian Country Star. All Rights Reserved.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}
