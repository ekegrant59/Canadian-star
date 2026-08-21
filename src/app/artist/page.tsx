import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ApplicationFlow } from '@/components/artist/application-flow';
import { getCurrentUser } from '@/lib/auth/guards';
import { getApplicationForUser } from '@/server/queries/application';
import { getCompetitionStage, isCompetitionStageActive } from '@/server/queries/public';
import { toFormData } from '@/components/artist/serialize';
import { mediaUrl } from '@/lib/storage';
import { resolveMusicLinkMetadata } from '@/lib/music-metadata';

export const metadata: Metadata = {
  title: 'Artist Application & Portal',
  description:
    'Apply to the Next Great Canadian Country Star competition. Complete your profile, upload media, confirm availability, and track your application status.',
};

/**
 * Never prerendered.
 *
 * `cacheComponents` is on, so Next builds a static shell for every route and
 * fails the build on uncached per-request data outside <Suspense>. This page
 * reads the session and the artist's own application. Both are per-request by
 * definition, and neither can be cached or shared between users. Suspense would
 * only defer the same read, and `use cache` over one artist's application is
 * the bug that serves it to somebody else.
 *
 * So the route blocks on the server. For an authed dashboard that's the right
 * trade: there's no shell worth prerendering when every byte depends on who
 * is asking.
 */
export const instant = false;

/**
 * The artist portal.
 *
 * Authorization happens HERE, at the data access point, not in proxy.ts. That
 * file may redirect for UX; it is never the security boundary. CVE-2025-29927
 * was this mistake at framework level.
 */
export default async function ArtistPortalPage() {
  const user = await getCurrentUser();

  if (!user) {
    // Come back here after sign-in, so a bookmarked link still works.
    redirect('/login?redirect=%2Fartist');
  }

  const [application, applicationsOpen, competitionStage] = await Promise.all([
    getApplicationForUser(user.id),
    isCompetitionStageActive('applications'),
    getCompetitionStage(),
  ]);
  const photoUrl = application?.primaryPhotoKey
    ? mediaUrl(application.primaryPhotoKey, 'profile')
    : null;
  const musicMetadata = application
    ? await resolveMusicLinkMetadata(Object.values(application.musicLinks ?? {}).filter(Boolean))
    : [];

  return (
    <ApplicationFlow
      initialData={{ ...toFormData(application, photoUrl), musicMetadata }}
      status={application?.status ?? null}
      competitionStage={competitionStage}
      submittedAt={application?.submittedAt?.toISOString() ?? null}
      applicationId={application?.applicationId ?? null}
      rejectionReason={application?.rejectionReason ?? null}
      initialStep={application?.currentStep ?? 1}
      applicationsOpen={applicationsOpen}
      accountEmail={user.email}
      accountName={user.name}
    />
  );
}
