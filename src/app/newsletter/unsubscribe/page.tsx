import Link from 'next/link';
import { unsubscribeNewsletterAction } from '@/server/actions/newsletter';

export const instant = false;

export default async function NewsletterUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; token?: string }>;
}) {
  const params = await searchParams;
  const result =
    params.id && params.token
      ? await unsubscribeNewsletterAction(params.id, params.token)
      : { ok: false as const, error: 'This unsubscribe link is not valid.' };
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0e0e0e] p-6 text-white">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold">
          {result.ok ? 'Unsubscribed' : 'Unable to unsubscribe'}
        </h1>
        <p className="mt-4 text-[#c9c4c1]">{result.ok ? result.data.message : result.error}</p>
        <Link href="/" className="mt-8 inline-block text-[#FF9B70] underline">
          Return to Canadian Country Star
        </Link>
      </div>
    </main>
  );
}
