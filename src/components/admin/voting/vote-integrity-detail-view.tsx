'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Clock3,
  Info,
  Mail,
  Network,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { reviewVoteAction } from '@/server/actions/admin';

type Signal = {
  code: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  score: number;
};
type VoteStatus = 'verified' | 'flagged' | 'blocked' | 'pending';
type Detail = {
  id: string;
  applicationId: string;
  voterEmail: string;
  artistName: string;
  createdAt: Date;
  verified: boolean;
  verifiedAt: Date | null;
  invalidatedAt: Date | null;
  invalidationReason: string | null;
  fraudScore: number;
  fraudSignals: Signal[];
  ipHash: string | null;
  deviceHash: string | null;
  userAgentHash: string | null;
  reviewDecision: string;
  reviewNotes: string | null;
  status: VoteStatus;
  history: Array<{ id: string; createdAt: Date; artistName: string; status: VoteStatus }>;
};

export function VoteIntegrityDetailView({ id, detail }: { id?: string; detail: Detail | null }) {
  const [current, setCurrent] = useState(detail);
  const [reason, setReason] = useState(detail?.reviewNotes ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!current)
    return (
      <div className="space-y-6">
        <BackLink />
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-500">
          Vote {id} could not be found.
        </div>
      </div>
    );

  const decide = (decision: 'clear' | 'invalidate') =>
    startTransition(async () => {
      setMessage(null);
      const result = await reviewVoteAction({
        voteId: current.id,
        decision,
        reason,
        confirmed: true,
      });
      if (!result.ok) return setMessage(result.error);
      setCurrent({
        ...current,
        status: decision === 'clear' ? (current.verified ? 'verified' : 'pending') : 'blocked',
        reviewDecision: decision === 'clear' ? 'cleared' : 'invalidated',
        invalidatedAt: decision === 'invalidate' ? new Date() : null,
        invalidationReason: decision === 'invalidate' ? reason : null,
      });
      setMessage(
        decision === 'clear'
          ? 'This activity has been cleared as legitimate.'
          : 'This vote has been invalidated and removed from counted totals.',
      );
    });

  const invalidated = Boolean(current.invalidatedAt);
  const scoreTone =
    current.fraudScore >= 70
      ? 'text-red-600'
      : current.fraudScore >= 40
        ? 'text-amber-600'
        : 'text-emerald-600';
  const content = statusContent(current.status);

  return (
    <div className="space-y-6">
      <BackLink />
      <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-[10px] font-black tracking-wider uppercase ${content.eyebrowClass}`}
              >
                {content.eyebrow}
              </span>
              <StatusBadge status={current.status} />
            </div>
            <h1 className="mt-4 text-2xl font-black text-gray-950 sm:text-3xl">{content.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
              {content.description}
            </p>
          </div>
          <div className="min-w-[180px] rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">
              {content.scoreLabel}
            </p>
            <p className={`mt-1 text-4xl font-black ${scoreTone}`}>
              {current.fraudScore}
              <span className="text-lg text-gray-400">/100</span>
            </p>
            <p className="mt-1 text-xs text-gray-500">{content.scoreDescription}</p>
          </div>
        </div>
      </header>
      {message && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
        >
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
        <main className="space-y-6">
          <Card>
            <Heading icon={Info} title={content.detailsTitle} />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Fact icon={Mail} label="Voter email" value={current.voterEmail} />
              <Fact
                icon={UserRound}
                label="Artist supported"
                value={current.artistName}
                href={`/admin/applications/${current.applicationId}`}
              />
              <Fact icon={Clock3} label="Activity time" value={formatDate(current.createdAt)} />
              <Fact icon={ShieldCheck} label="Vote outcome" value={content.outcome} />
              {invalidated && (
                <Fact
                  icon={Ban}
                  label="Reason for invalidation"
                  value={
                    current.invalidationReason || current.reviewNotes || 'No reason was recorded'
                  }
                />
              )}
              {invalidated && current.invalidatedAt && (
                <Fact
                  icon={Clock3}
                  label="Invalidated on"
                  value={formatDate(current.invalidatedAt)}
                />
              )}
            </div>
          </Card>

          <Card>
            <Heading
              icon={current.status === 'verified' ? CheckCircle2 : AlertTriangle}
              title={content.signalsTitle}
            />
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              {content.signalsDescription}
            </p>
            <div className="mt-5 space-y-3">
              {current.fraudSignals.length ? (
                current.fraudSignals.map((signal) => (
                  <div
                    key={signal.code}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold text-gray-900">{signal.title}</p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${signal.severity === 'high' ? 'bg-red-100 text-red-700' : signal.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}
                      >
                        {signal.severity} · +{signal.score}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">
                      {signal.description}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                  {content.noSignals}
                </p>
              )}
            </div>
          </Card>

          <Card>
            <Heading icon={Network} title="Related activity" />
            <p className="mt-2 text-sm text-gray-600">
              Other voting activity connected by the same privacy-safe browser or network
              fingerprint.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-gray-200 text-[10px] font-black tracking-wider text-gray-400 uppercase">
                  <tr>
                    <th className="py-3">When</th>
                    <th>Artist</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {current.history.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 text-xs text-gray-500">{formatDate(item.createdAt)}</td>
                      <td className="font-semibold text-gray-900">{item.artistName}</td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </main>

        <aside className="space-y-6">
          <section className={`rounded-2xl border p-6 shadow-xs ${content.actionCardClass}`}>
            <Heading icon={content.actionIcon} title={content.actionTitle} />
            <p className="mt-2 text-sm leading-relaxed text-gray-700">
              {content.actionDescription}
            </p>
            <label className="mt-5 block text-xs font-bold text-gray-700" htmlFor="review-reason">
              Decision note
              <textarea
                id="review-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                placeholder={content.notePlaceholder}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 outline-none focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00]/20"
              />
            </label>
            <p className="mt-1 text-[11px] text-gray-500">Required for the audit record.</p>
            <div className="mt-4 grid gap-2">
              {current.status !== 'verified' || invalidated ? (
                <button
                  disabled={
                    isPending ||
                    reason.trim().length < 3 ||
                    (current.status === 'pending' && current.reviewDecision === 'cleared')
                  }
                  onClick={() => decide('clear')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-black text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {invalidated
                    ? 'Restore as legitimate'
                    : current.status === 'pending'
                      ? 'Clear warning only'
                      : 'Clear as legitimate'}
                </button>
              ) : null}
              {!invalidated && (
                <button
                  disabled={isPending || reason.trim().length < 3}
                  onClick={() => decide('invalidate')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Ban className="h-4 w-4" />
                  Invalidate and remove vote
                </button>
              )}
            </div>
            {invalidated && (
              <p className="mt-3 text-xs font-semibold text-red-700">
                This vote is excluded from totals. Restoring it will count only if its email
                verification was completed.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/admin/voting"
      className="inline-flex items-center gap-2 text-sm font-bold text-[#FF5C00]"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to voting
    </Link>
  );
}
function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
      {children}
    </section>
  );
}
function Heading({ icon: Icon, title }: { icon: typeof Info; title: string }) {
  return (
    <h2 className="flex items-center gap-2 text-base font-black text-gray-950">
      <Icon className="h-5 w-5 text-[#FF5C00]" />
      {title}
    </h2>
  );
}
function Fact({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Info;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <>
      <p className="flex items-center gap-2 text-[10px] font-black tracking-wider text-gray-400 uppercase">
        <Icon className="h-4 w-4" />
        {label}
      </p>
      <p className="mt-1 text-sm font-bold break-words text-gray-900">{value}</p>
    </>
  );
  return href ? (
    <Link
      href={href}
      className="rounded-xl border border-gray-100 p-3 hover:border-orange-200 hover:bg-orange-50/40"
    >
      {content}
    </Link>
  ) : (
    <div className="rounded-xl border border-gray-100 p-3">{content}</div>
  );
}
function statusContent(status: VoteStatus) {
  if (status === 'flagged')
    return {
      eyebrow: 'Flagged activity',
      eyebrowClass: 'bg-amber-50 text-amber-700',
      title: 'Investigate this flagged vote',
      description:
        'Automated checks found a pattern that needs a human review. Decide whether the activity is legitimate or should be removed.',
      scoreLabel: 'Integrity concern',
      scoreDescription: 'Review recommended',
      detailsTitle: 'Flagged vote details',
      outcome: 'Verified, but flagged for review',
      signalsTitle: 'Warning signals',
      signalsDescription:
        'These checks explain why the vote was flagged. They are evidence to consider, not an automatic verdict.',
      noSignals: 'The vote was flagged by a broader rule, but no individual signal was saved.',
      actionTitle: 'Resolve this flag',
      actionDescription:
        'Clear the flag if the activity looks legitimate, or invalidate it if the evidence supports removing the vote.',
      notePlaceholder: 'Explain why you are clearing or invalidating this flagged vote...',
      actionCardClass: 'border-amber-200 bg-amber-50/70',
      actionIcon: AlertTriangle,
    };
  if (status === 'blocked')
    return {
      eyebrow: 'Invalidated vote',
      eyebrowClass: 'bg-red-50 text-red-700',
      title: 'Review an invalidated vote',
      description:
        'This vote has already been removed from the counted totals. The record is preserved here for audit and possible restoration.',
      scoreLabel: 'Recorded concern score',
      scoreDescription: 'Vote excluded',
      detailsTitle: 'Invalidation details',
      outcome: 'Removed from counted totals',
      signalsTitle: 'Recorded signals',
      signalsDescription: 'These signals were captured when the activity was assessed.',
      noSignals: 'No automated warning signals were recorded.',
      actionTitle: 'Invalidated decision',
      actionDescription:
        'Restore this vote only when your review confirms it is legitimate. A restored vote counts only if the email was verified.',
      notePlaceholder: 'Explain why this invalidated vote should be restored...',
      actionCardClass: 'border-red-200 bg-red-50/70',
      actionIcon: Ban,
    };
  if (status === 'pending')
    return {
      eyebrow: 'Unverified attempt',
      eyebrowClass: 'bg-gray-100 text-gray-600',
      title: 'Review an incomplete vote attempt',
      description:
        'The voter requested a verification code but has not completed email verification. This attempt does not count as a vote.',
      scoreLabel: 'Recorded concern score',
      scoreDescription: 'Not counted',
      detailsTitle: 'Verification details',
      outcome: 'Not counted — email verification incomplete',
      signalsTitle: 'Verification context',
      signalsDescription:
        'Any signals below describe the request pattern, not a confirmed invalid vote.',
      noSignals: 'No automated warning signals were recorded.',
      actionTitle: 'Handle incomplete verification',
      actionDescription:
        'Clear any warning if this looks normal. Invalidate only when there is clear evidence the attempt should be excluded.',
      notePlaceholder: 'Explain how you reviewed this incomplete attempt...',
      actionCardClass: 'border-gray-200 bg-gray-50',
      actionIcon: ShieldCheck,
    };
  return {
    eyebrow: 'Verified vote',
    eyebrowClass: 'bg-emerald-50 text-emerald-700',
    title: 'Review a verified vote',
    description:
      'This voter completed email verification and the vote is currently included in the artist’s counted total.',
    scoreLabel: 'Recorded concern score',
    scoreDescription: 'Vote currently counts',
    detailsTitle: 'Verified vote details',
    outcome: 'Counted in the artist total',
    signalsTitle: 'Recorded signals',
    signalsDescription:
      'A verified vote may still have contextual signals. Review them before changing its status.',
    noSignals: 'No automated warning signals were recorded.',
    actionTitle: 'Vote decision',
    actionDescription:
      'Leave this vote counted unless your review finds enough evidence to invalidate it.',
    notePlaceholder: 'Explain any decision to invalidate this verified vote...',
    actionCardClass: 'border-emerald-200 bg-emerald-50/70',
    actionIcon: CheckCircle2,
  };
}

function StatusBadge({ status }: { status: VoteStatus }) {
  const styles =
    status === 'verified'
      ? 'bg-emerald-100 text-emerald-700'
      : status === 'flagged'
        ? 'bg-amber-100 text-amber-700'
        : status === 'blocked'
          ? 'bg-red-100 text-red-700'
          : 'bg-gray-100 text-gray-600';
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black tracking-wider uppercase ${styles}`}
    >
      {status === 'pending'
        ? 'Pending verification'
        : status === 'blocked'
          ? 'Invalidated'
          : status}
    </span>
  );
}
function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}
