import { z } from 'zod';
import { normalizeEmail } from '@/lib/email-normalize';

/**
 * Sign-up and sign-in schemas. Imported by BOTH the client form and the server
 * action, so a rule cannot exist in only one place.
 *
 * Every string is capped. Leave a z.string() uncapped on a form field and
 * nothing stops a POST carrying a 50MB name.
 */

/**
 * Minimum password length.
 *
 * Must stay >= the `minPasswordLength` in src/lib/auth/index.ts. Make this the
 * looser of the two and the client accepts a password Better Auth then throws
 * out, so the user gets a generic server error from a form that just told them
 * everything looked fine.
 */
export const PASSWORD_MIN_LENGTH = 8;
/** Better Auth's own default cap. Bcrypt-style truncation surprises live above this. */
export const PASSWORD_MAX_LENGTH = 128;

const emailField = z
  .string()
  .trim()
  .min(1, 'Enter your email address.')
  .max(254, 'That email address is too long.')
  /**
   * Runs through the same normalizer as vote deduplication, not a regex. NFKC
   * goes first, so a homoglyph of `@` can't spawn a second identity for one
   * mailbox. Auth.js shipped that bypass in July 2026; it breaks accounts just
   * as thoroughly as it breaks votes.
   */
  .refine((value) => normalizeEmail(value).ok, 'Enter a valid email address.');

const passwordField = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, 'That password is too long.');

export const signUpSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Enter your full name.').max(200, 'That name is too long.'),
    email: emailField,
    password: passwordField,
    confirmPassword: z.string().max(PASSWORD_MAX_LENGTH),
    /**
     * §4.1 leaves the applicant age formally undecided; this build assumes
     * 18+. See AGE_MINIMUM in src/config/event.ts. Lower it and parental
     * consent handling has to exist before a single minor's data is collected
     * or published.
     */
    confirmedAge: z.literal(true, {
      message: 'You must confirm you meet the minimum age requirement.',
    }),
    /**
     * Acceptance of the rules and privacy policy. The consent RECORD, carrying
     * the exact wording shown, gets written server-side to email_consents.
     * CASL puts the burden of proving consent on the sender, and a lone boolean
     * proves nothing.
     */
    acceptedTerms: z.literal(true, {
      message: 'You must accept the terms and privacy policy.',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Enter your password.').max(PASSWORD_MAX_LENGTH),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;

/**
 * The exact consent wording shown at sign-up.
 *
 * Stored verbatim in email_consents with the timestamp and hashed IP.
 * CHANGING THIS STRING CHANGES WHAT WE CAN PROVE. Bump CONSENT_VERSION
 * whenever the wording moves, so old records stay tied to the text that was
 * actually on screen when someone ticked the box.
 */
export const SIGNUP_CONSENT_WORDING = {
  age: 'I confirm that I am 18 years of age or older',
  terms: 'I have read and agree to the Terms and Conditions and Privacy Policy',
} as const;

export const CONSENT_VERSION = '2026-08-14';
