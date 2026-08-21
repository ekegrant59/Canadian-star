import { redirect } from 'next/navigation';

/**
 * The application and the dashboard are one surface. An artist has exactly one
 * application and /artist renders whichever step it sits on. The earlier shape
 * gave the same flow a second route with its own state, which let two pages
 * hold different unsaved answers for one application.
 */
export default function ArtistApplyRedirect() {
  redirect('/artist');
}
