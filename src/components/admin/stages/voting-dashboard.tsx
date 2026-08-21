'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, Users, CheckCircle2, ShieldCheck, AlertTriangle, MailCheck } from 'lucide-react';
import type { AdminApplicationRecord } from '@/server/queries/admin';
import { ProfileImage } from '@/components/shared/profile-image';

export function VotingDashboard({
  applications,
  metrics,
}: {
  applications: AdminApplicationRecord[];
  metrics: {
    totalVotesCast: number;
    totalAttempts: number;
    verifiedVoters: number;
    flaggedVotes: number;
    invalidatedVotes: number;
  };
}) {
  const candidates = applications
    .filter(
      (app) =>
        app.lifecycleStatus === 'approved' ||
        app.lifecycleStatus === 'shortlisted' ||
        app.lifecycleStatus === 'finalist',
    )
    .sort((a, b) => b.verifiedVotes - a.verifiedVotes || a.stageName.localeCompare(b.stageName));

  return (
    <div className="space-y-6 rounded-xl bg-white p-4">
      <div>
        <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">FAN VOTING</h2>
        <p className="mt-1 text-sm text-gray-600">
          Approved artists currently eligible for public fan voting.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Voting candidates" value={candidates.length} icon={Users} accent />
        <Metric label="Verified votes" value={metrics.totalVotesCast} icon={ShieldCheck} />
        <Metric
          label="Pending verification"
          value={Math.max(
            0,
            metrics.totalAttempts - metrics.verifiedVoters - metrics.invalidatedVotes,
          )}
          icon={MailCheck}
        />
        <Metric
          label="Flagged votes"
          value={metrics.flaggedVotes}
          icon={AlertTriangle}
          warning={metrics.flaggedVotes > 0}
        />
      </div>

      <Roster
        title="Voting candidates"
        empty="No approved artists are available for voting yet. Approve applications to add artists to this roster."
        applications={candidates}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  accent = false,
  warning = false,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  accent?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="flex min-h-32 items-center justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase">{label}</p>
        <p
          className={`mt-2 text-3xl font-black ${warning ? 'text-amber-600' : accent ? 'text-[#FF5C00]' : 'text-gray-900'}`}
        >
          {value}
        </p>
      </div>
      <Icon
        className={`h-6 w-6 ${warning ? 'text-amber-500' : accent ? 'text-[#FF5C00]' : 'text-gray-400'}`}
      />
    </div>
  );
}

function Roster({
  title,
  empty,
  applications,
}: {
  title: string;
  empty: string;
  applications: AdminApplicationRecord[];
}) {
  const router = useRouter();
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-extrabold text-gray-900">{title}</h3>
          <p className="mt-1 text-xs text-gray-500">
            Approved artists visible in the public voting roster.
          </p>
        </div>
        <span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold tracking-wider text-emerald-700 uppercase">
          {applications.length} eligible
        </span>
      </div>
      {applications.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-gray-500">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="border-b border-gray-100 bg-gray-50/70 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
              <tr>
                <th className="px-5 py-3">Rank / artist</th>
                <th className="px-4 py-3">Verified votes</th>
                <th className="px-4 py-3">Pending</th>
                <th className="px-4 py-3">Flagged</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {applications.map((app, index) => (
                <tr
                  key={app.id}
                  tabIndex={0}
                  role="link"
                  aria-label={`Open ${app.stageName} application review`}
                  onClick={() => router.push(`/admin/applications/${app.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      router.push(`/admin/applications/${app.id}`);
                    }
                  }}
                  className="cursor-pointer transition-colors hover:bg-orange-50/30 focus:bg-orange-50/50 focus:outline-none"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-sm font-black text-gray-400">
                        {index + 1}
                      </span>
                      <ProfileImage
                        src={app.avatarUrl}
                        alt={app.stageName}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900">{app.stageName}</p>
                        <p className="text-[10px] text-gray-400">
                          {app.location} · {app.actType}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-base font-black text-gray-900">
                    {app.verifiedVotes.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 font-semibold text-gray-600">
                    {app.pendingVotes.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 font-semibold text-amber-600">
                    {app.flaggedVotes.toLocaleString()}
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold tracking-wider text-emerald-700 uppercase">
                      <CheckCircle2 className="h-3 w-3" /> Approved
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/admin/applications/${app.id}`}
                      onClick={(event) => event.stopPropagation()}
                      aria-label={`Review ${app.stageName}`}
                      className="inline-flex rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
