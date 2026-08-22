'use server';

import { randomUUID } from 'node:crypto';
import { headers } from 'next/headers';
import { hashPassword } from 'better-auth/crypto';
import { and, count, eq, gt, isNull, ne } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { accounts, auditLog, sessions, users } from '@/db/schema';
import { requireSuperAdminOrThrow } from '@/lib/auth/guards';
import { normalizeEmail } from '@/lib/email-normalize';
import { generateToken, getClientIp, hashIp, hashToken } from '@/lib/crypto';
import { checkRateLimit } from '@/lib/rate-limit';
import { renderCustomBroadcastEmail } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/send';
import { escapeHtml } from '@/lib/email/layout';
import { SITE_URL } from '@/config/site-url';

const EMAIL_BASE_URL = (process.env.BETTER_AUTH_URL || SITE_URL).replace(/\/+$/, '');
import { auth } from '@/lib/auth';
import { actionError, actionOk } from './types';

const accessLevel = z.enum(['super', 'read_write', 'read_only']);
const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().max(254),
  accessLevel,
});
const updateSchema = z.object({ userId: z.string().uuid(), accessLevel });
const statusSchema = z.object({ userId: z.string().uuid(), active: z.boolean() });
const resendSchema = z.object({ userId: z.string().uuid() });
const deleteSchema = z.object({ userId: z.string().uuid() });
const acceptSchema = z
  .object({
    token: z.string().min(32).max(500),
    password: z.string().min(12).max(128),
    confirmPassword: z.string().min(12).max(128),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });
const INVITATION_TTL_MS = 24 * 60 * 60 * 1000;

async function audit(
  actorId: string,
  action: string,
  entityId: string,
  before: unknown,
  after: unknown,
) {
  const requestHeaders = await headers();
  await db.insert(auditLog).values({
    id: randomUUID(),
    actorId,
    action,
    entityType: 'user',
    entityId,
    before,
    after,
    ipHash: hashIp(getClientIp(requestHeaders)),
  });
}

async function sendInvitation(input: { userId: string; name: string; email: string }) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);
  await db
    .update(users)
    .set({
      adminInvitationTokenHash: hashToken(token),
      adminInvitationExpiresAt: expiresAt,
      adminInvitedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, input.userId), eq(users.role, 'admin')));
  const inviteUrl = `${EMAIL_BASE_URL}/admin/invite?token=${encodeURIComponent(token)}`;
  const rendered = renderCustomBroadcastEmail({
    headline: 'You have been invited to the admin portal',
    bodyHtml: `<p>${escapeHtml(input.name)}, you have been invited to help manage Canadian Country Star.</p><p>Create your own password using the secure invitation below. This invitation expires in 24 hours and can only be used once.</p>`,
    ctaText: 'ACCEPT ADMIN INVITATION',
    ctaUrl: inviteUrl,
  });
  const result = await sendEmail({
    to: input.email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });
  return { success: result.success, expiresAt };
}

export async function createAdminUserAction(input: unknown) {
  let actor;
  try {
    actor = await requireSuperAdminOrThrow();
  } catch {
    return actionError('Only a super admin can add administrators.');
  }
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return actionError('Enter a valid name, email address, and access level.');
  const normalized = normalizeEmail(parsed.data.email);
  if (!normalized.ok) return actionError('Enter a valid email address.');

  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.emailCanonical, normalized.canonical))
      .limit(1);
    if (existing) return actionError('An account already exists for this email address.');
    const userId = randomUUID();
    await db.insert(users).values({
      id: userId,
      email: normalized.raw,
      emailRaw: normalized.raw,
      emailCanonical: normalized.canonical,
      emailVerified: false,
      name: parsed.data.name,
      role: 'admin',
      adminAccessLevel: parsed.data.accessLevel,
    });
    await audit(actor.id, 'admin.created', userId, null, {
      email: normalized.canonical,
      accessLevel: parsed.data.accessLevel,
    });
    const invitation = await sendInvitation({
      userId,
      name: parsed.data.name,
      email: normalized.raw,
    });
    return actionOk({
      userId,
      emailSent: invitation.success,
      invitationExpiresAt: invitation.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('[admin-users] create failed', error);
    return actionError('The administrator account could not be created.');
  }
}

export async function resendAdminInvitationAction(input: unknown) {
  let actor;
  try {
    actor = await requireSuperAdminOrThrow();
  } catch {
    return actionError('Only a super admin can resend invitations.');
  }
  const parsed = resendSchema.safeParse(input);
  if (!parsed.success) return actionError('Administrator not found.');
  const [target] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      passwordSetAt: users.adminPasswordSetAt,
      bannedAt: users.bannedAt,
    })
    .from(users)
    .where(and(eq(users.id, parsed.data.userId), eq(users.role, 'admin')))
    .limit(1);
  if (!target) return actionError('Administrator not found.');
  if (target.passwordSetAt)
    return actionError('This administrator has already created their password.');
  if (target.bannedAt)
    return actionError('Reactivate this administrator before resending an invitation.');
  const invitation = await sendInvitation({
    userId: target.id,
    name: target.name || 'Administrator',
    email: target.email,
  });
  await audit(actor.id, 'admin.invitation_resent', target.id, null, {
    expiresAt: invitation.expiresAt,
  });
  return invitation.success
    ? actionOk({ invitationExpiresAt: invitation.expiresAt.toISOString() })
    : actionError('The invitation was renewed, but Brevo could not deliver the email. Try again.');
}

export async function acceptAdminInvitationAction(input: unknown) {
  const parsed = acceptSchema.safeParse(input);
  if (!parsed.success)
    return actionError('Choose a password of at least 12 characters and confirm it correctly.');
  const requestHeaders = await headers();
  const ipHash = hashIp(getClientIp(requestHeaders));
  const limit = await checkRateLimit('signin:ip', ipHash);
  if (!limit.allowed) return actionError('Too many attempts. Please try again later.');
  const tokenHash = hashToken(parsed.data.token);
  let acceptedEmail: string;
  try {
    const [target] = await db
      .select({ id: users.id, email: users.email, bannedAt: users.bannedAt })
      .from(users)
      .where(
        and(
          eq(users.adminInvitationTokenHash, tokenHash),
          gt(users.adminInvitationExpiresAt, new Date()),
          eq(users.role, 'admin'),
        ),
      )
      .limit(1);
    if (!target || target.bannedAt)
      return actionError(
        'This invitation is invalid or has expired. Ask a super admin to resend it.',
      );
    acceptedEmail = target.email;
    const password = await hashPassword(parsed.data.password);
    await db.transaction(async (tx) => {
      const activated = await tx
        .update(users)
        .set({
          emailVerified: true,
          adminInvitationTokenHash: null,
          adminInvitationExpiresAt: null,
          adminPasswordSetAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(users.id, target.id),
            eq(users.adminInvitationTokenHash, tokenHash),
            gt(users.adminInvitationExpiresAt, new Date()),
          ),
        )
        .returning({ id: users.id });
      if (!activated[0]) throw new Error('INVITATION_USED');
      await tx.insert(accounts).values({
        id: randomUUID(),
        userId: target.id,
        accountId: target.id,
        providerId: 'credential',
        password,
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVITATION_USED')
      return actionError('This invitation has already been used.');
    console.error('[admin-users] invitation acceptance failed', error);
    return actionError('The invitation could not be accepted. Please try again.');
  }

  try {
    await auth.api.signInEmail({
      body: { email: acceptedEmail, password: parsed.data.password },
      headers: requestHeaders,
    });
    return actionOk({ redirectTo: '/admin/login/setup-2fa' });
  } catch (error) {
    // The password was already committed and the invitation consumed. Do not
    // present this as an invitation failure that the user can no longer retry.
    console.error('[admin-users] invitation accepted but automatic sign-in failed', error);
    return actionOk({ redirectTo: '/admin/login?invitation=accepted' });
  }
}

export async function updateAdminAccessAction(input: unknown) {
  let actor;
  try {
    actor = await requireSuperAdminOrThrow();
  } catch {
    return actionError('Only a super admin can change administrator access.');
  }
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return actionError('Select a valid administrator access level.');
  if (parsed.data.userId === actor.id && parsed.data.accessLevel !== 'super')
    return actionError('You cannot remove your own super-admin access.');
  const [target] = await db
    .select({ accessLevel: users.adminAccessLevel, role: users.role })
    .from(users)
    .where(eq(users.id, parsed.data.userId))
    .limit(1);
  if (!target || target.role !== 'admin') return actionError('Administrator not found.');
  await db
    .update(users)
    .set({ adminAccessLevel: parsed.data.accessLevel, updatedAt: new Date() })
    .where(eq(users.id, parsed.data.userId));
  await db.delete(sessions).where(eq(sessions.userId, parsed.data.userId));
  await audit(
    actor.id,
    'admin.access_changed',
    parsed.data.userId,
    { accessLevel: target.accessLevel },
    { accessLevel: parsed.data.accessLevel },
  );
  return actionOk({ accessLevel: parsed.data.accessLevel });
}

export async function setAdminActiveAction(input: unknown) {
  let actor;
  try {
    actor = await requireSuperAdminOrThrow();
  } catch {
    return actionError('Only a super admin can deactivate administrators.');
  }
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return actionError('Select a valid administrator account.');
  if (parsed.data.userId === actor.id && !parsed.data.active)
    return actionError('You cannot deactivate your own account.');
  const [target] = await db
    .select({ role: users.role, bannedAt: users.bannedAt, accessLevel: users.adminAccessLevel })
    .from(users)
    .where(eq(users.id, parsed.data.userId))
    .limit(1);
  if (!target || target.role !== 'admin') return actionError('Administrator not found.');
  if (!parsed.data.active && target.accessLevel === 'super') {
    const [otherSupers] = await db
      .select({ value: count() })
      .from(users)
      .where(
        and(
          eq(users.role, 'admin'),
          eq(users.adminAccessLevel, 'super'),
          ne(users.id, parsed.data.userId),
          isNull(users.bannedAt),
        ),
      );
    if (Number(otherSupers?.value ?? 0) === 0)
      return actionError('At least one active super admin must remain.');
  }
  const bannedAt = parsed.data.active ? null : new Date();
  await db
    .update(users)
    .set({
      bannedAt,
      banReason: parsed.data.active ? null : 'Deactivated by super admin',
      ...(parsed.data.active
        ? {}
        : { adminInvitationTokenHash: null, adminInvitationExpiresAt: null }),
      updatedAt: new Date(),
    })
    .where(eq(users.id, parsed.data.userId));
  if (!parsed.data.active) await db.delete(sessions).where(eq(sessions.userId, parsed.data.userId));
  await audit(
    actor.id,
    parsed.data.active ? 'admin.reactivated' : 'admin.deactivated',
    parsed.data.userId,
    { active: !target.bannedAt },
    { active: parsed.data.active },
  );
  return actionOk({ active: parsed.data.active });
}

/** Permanently removes an administrator and their login/security records. */
export async function deleteAdminUserAction(input: unknown) {
  let actor;
  try {
    actor = await requireSuperAdminOrThrow();
  } catch {
    return actionError('Only a super admin can delete administrators.');
  }
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return actionError('Administrator not found.');
  if (parsed.data.userId === actor.id)
    return actionError('You cannot delete your own administrator account.');

  const [target] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      accessLevel: users.adminAccessLevel,
      bannedAt: users.bannedAt,
    })
    .from(users)
    .where(and(eq(users.id, parsed.data.userId), eq(users.role, 'admin')))
    .limit(1);
  if (!target) return actionError('Administrator not found.');

  if (target.accessLevel === 'super' && !target.bannedAt) {
    const [otherSupers] = await db
      .select({ value: count() })
      .from(users)
      .where(
        and(
          eq(users.role, 'admin'),
          eq(users.adminAccessLevel, 'super'),
          ne(users.id, target.id),
          isNull(users.bannedAt),
        ),
      );
    if (Number(otherSupers?.value ?? 0) === 0)
      return actionError('At least one active super admin must remain.');
  }

  try {
    const requestHeaders = await headers();
    await db.transaction(async (tx) => {
      await tx.insert(auditLog).values({
        id: randomUUID(),
        actorId: actor.id,
        action: 'admin.deleted',
        entityType: 'user',
        entityId: target.id,
        before: {
          email: target.email,
          name: target.name,
          role: target.role,
          accessLevel: target.accessLevel,
          active: !target.bannedAt,
        },
        after: null,
        ipHash: hashIp(getClientIp(requestHeaders)),
      });
      await tx.delete(users).where(eq(users.id, target.id));
    });
    return actionOk({ deleted: true });
  } catch (error) {
    console.error('[admin-users] delete failed', error);
    return actionError('The administrator could not be deleted.');
  }
}
