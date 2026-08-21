import 'server-only';

import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';

export async function getAdminUsers() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      accessLevel: users.adminAccessLevel,
      twoFactorEnabled: users.twoFactorEnabled,
      bannedAt: users.bannedAt,
      createdAt: users.createdAt,
      invitationExpiresAt: users.adminInvitationExpiresAt,
      passwordSetAt: users.adminPasswordSetAt,
    })
    .from(users)
    .where(eq(users.role, 'admin'))
    .orderBy(asc(users.name), asc(users.email));
}
