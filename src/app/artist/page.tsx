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
export default async function ArtistPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string | string[] }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    // Come back here after sign-in, so a bookmarked link still works.
    redirect('/login?redirect=%2Fartist');
  }

  const [{ edit }, application, applicationsOpen, competitionStage] = await Promise.all([
    searchParams,
    getApplicationForUser(user.id),
    isCompetitionStageActive('applications'),
    getCompetitionStage(),
  ]);
  const editRequested = Array.isArray(edit) ? edit.includes('1') : edit === '1';
  const photoKey = application?.pendingEdits?.photoKey
    ? String(application.pendingEdits.photoKey)
    : application?.primaryPhotoKey;
  const photoUrl = photoKey ? mediaUrl(photoKey, 'profile') : null;
  const pendingMusic = Array.isArray(application?.pendingEdits?.recordedMusicUrls)
    ? application.pendingEdits.recordedMusicUrls.filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      )
    : null;
  const musicMetadata = application
    ? await resolveMusicLinkMetadata(
        pendingMusic ?? Object.values(application.musicLinks ?? {}).filter(Boolean),
      )
    : [];
  const pendingEditKeys =
    application?.pendingEditsSubmittedAt && application.pendingEdits
      ? getChangedPendingEditKeys(application)
      : [];

  return (
    <ApplicationFlow
      key={editRequested ? 'edit-mode' : 'dashboard-mode'}
      initialData={{ ...toFormData(application, photoUrl), musicMetadata }}
      status={application?.status ?? null}
      competitionStage={competitionStage}
      submittedAt={application?.submittedAt?.toISOString() ?? null}
      applicationId={application?.applicationId ?? null}
      rejectionReason={application?.rejectionReason ?? null}
      hasPendingEdits={Boolean(application?.pendingEditsSubmittedAt)}
      pendingEditKeys={pendingEditKeys}
      initialStep={application?.currentStep ?? 1}
      startInEditMode={editRequested}
      applicationsOpen={applicationsOpen}
      accountEmail={user.email}
      accountName={user.name}
    />
  );
}

function getChangedPendingEditKeys(
  application: NonNullable<Awaited<ReturnType<typeof getApplicationForUser>>>,
) {
  const pending = application.pendingEdits ?? {};
  const current: Record<string, unknown> = {
    actName: application.actName,
    actType: application.actType,
    locationCity: application.locationCity,
    contactEmail: application.contactEmail,
    contactPhone: application.contactPhone,
    bio: application.bio,
    photoKey: application.primaryPhotoKey,
    performanceVideoUrls: application.performanceVideoUrls.length
      ? application.performanceVideoUrls
      : application.performanceVideoUrl
        ? [application.performanceVideoUrl]
        : [],
    recordedMusicUrls: Object.values(application.musicLinks ?? {}).filter(Boolean),
    availableAllDates: application.availableAllDates,
    isEligible: application.isOfAge,
    acceptedRules: application.acceptedRules,
    acceptedMediaRelease: application.acceptedMediaRelease,
    instagram: application.socialLinks?.instagram,
    tiktok: application.socialLinks?.tiktok,
    x: application.socialLinks?.x,
    youtube: application.socialLinks?.youtube,
    facebook: application.socialLinks?.facebook,
    websiteUrl: application.websiteUrl,
  };
  const normalize = (value: unknown): unknown => {
    if (Array.isArray(value))
      return value
        .filter((item) => typeof item === 'string' && item.trim())
        .map((item) => String(item).trim());
    if (typeof value === 'string') return value.trim();
    return value ?? null;
  };
  return Object.keys(current).filter(
    (key) => JSON.stringify(normalize(current[key])) !== JSON.stringify(normalize(pending[key])),
  );
}
