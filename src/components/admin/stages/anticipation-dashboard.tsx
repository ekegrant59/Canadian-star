'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Award, Eye, ListChecks, Search, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { AdminApplicationRecord } from '@/server/queries/admin';
import { ProfileImage } from '@/components/shared/profile-image';

export function AnticipationDashboard({
  applications,
}: {
  applications: AdminApplicationRecord[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<
    'all' | 'under_review' | 'shortlisted' | 'assigned' | 'unassigned'
  >('all');
  const [search, setSearch] = useState('');
  const candidates = useMemo(
    () =>
      [...applications]
        .filter((app) => ['approved', 'shortlisted', 'finalist'].includes(app.lifecycleStatus))
        .sort((a, b) => b.verifiedVotes - a.verifiedVotes || a.stageName.localeCompare(b.stageName))
        .slice(0, 30),
    [applications],
  );
  const selected = candidates.filter(
    (app) => app.lifecycleStatus === 'shortlisted' || app.lifecycleStatus === 'finalist',
  );
  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return candidates.filter((app) => {
      const matchesStatus =
        filter === 'all' ||
        (filter === 'under_review'
          ? app.lifecycleStatus === 'approved'
          : filter === 'shortlisted'
            ? app.lifecycleStatus === 'shortlisted' || app.lifecycleStatus === 'finalist'
            : filter === 'assigned'
              ? Boolean(app.qualifyingShow)
              : !app.qualifyingShow);
      return matchesStatus && fuzzyMatch(query, `${app.stageName} ${app.location} ${app.email}`);
    });
  }, [candidates, filter, search]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">INDUSTRY REVIEW</h2>
        <p className="mt-1 text-sm text-gray-600">
          Top 30 fan-vote artists under industry review. Select the Final 16 from this queue.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Top 30 under review" value={candidates.length} icon={Award} />
        <Metric label="Final 16 selected" value={selected.length} icon={Users} accent />
        <Metric
          label="Selections remaining"
          value={Math.max(0, 16 - selected.length)}
          icon={ListChecks}
        />
      </div>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
        <h3 className="border-b border-gray-100 px-5 py-4 text-sm font-extrabold text-gray-900 uppercase">
          Top 30 semi-finalist review queue
        </h3>
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50/60 px-5 py-3">
          {(
            [
              ['all', 'All top 30'],
              ['under_review', 'Still under review'],
              ['shortlisted', 'Semi-finalists'],
              ['assigned', 'Assigned'],
              ['unassigned', 'Unassigned'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full px-3 py-1.5 text-[10px] font-black tracking-wider uppercase ${filter === value ? 'bg-[#FF5C00] text-white' : 'bg-white text-gray-500 ring-1 ring-gray-200 hover:text-gray-900'}`}
            >
              {label}
            </button>
          ))}
          <span className="ml-auto text-[10px] font-bold tracking-wider text-gray-400 uppercase">
            {filteredCandidates.length} shown · max 16 selected
          </span>
        </div>
        <div className="border-b border-gray-100 px-5 py-3">
          <label className="relative block max-w-md">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search artist, location, or email..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pr-3 pl-9 text-sm text-gray-900 outline-none focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00]/20"
            />
          </label>
        </div>
        {filteredCandidates.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-gray-500">
            No approved artists are available in the vote leaderboard yet.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredCandidates.map((app) => (
              <div
                key={app.id}
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/admin/applications/${app.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    router.push(`/admin/applications/${app.id}`);
                  }
                }}
                className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 hover:bg-orange-50/40 focus:bg-orange-50/50 focus:outline-none"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <RankBadge rank={candidates.indexOf(app) + 1} />
                  <ProfileImage
                    src={app.avatarUrl}
                    alt={app.stageName}
                    className="h-12 w-12 shrink-0 rounded-lg"
                  />
                  <div>
                    <p className="font-bold text-gray-900">{app.stageName}</p>
                    <p className="text-xs text-gray-500">
                      {app.location} · {app.verifiedVotes.toLocaleString()} verified votes
                    </p>
                    <p className="mt-1 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                      {app.lifecycleStatus === 'finalist'
                        ? 'Finalist'
                        : app.lifecycleStatus === 'shortlisted'
                          ? 'Final 16 selected'
                          : 'Awaiting Final 16 decision'}{' '}
                      ·{' '}
                      {app.qualifyingShow
                        ? `Assigned: ${app.qualifyingShow.label}`
                        : 'Unassigned to a qualifying show'}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/admin/applications/${app.id}`}
                  onClick={(event) => event.stopPropagation()}
                  aria-label={`Review ${app.stageName}`}
                  className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                >
                  <Eye className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const style =
    rank === 1
      ? 'bg-amber-100 text-amber-700 ring-amber-200'
      : rank === 2
        ? 'bg-gray-100 text-gray-600 ring-gray-200'
        : rank === 3
          ? 'bg-orange-100 text-orange-700 ring-orange-200'
          : 'bg-gray-50 text-gray-500 ring-gray-200';
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ring-1 ${style}`}
    >
      {rank}
    </span>
  );
}

function fuzzyMatch(query: string, value: string) {
  if (!query) return true;
  const normalized = value.toLowerCase();
  if (normalized.includes(query)) return true;
  const threshold = Math.max(1, Math.ceil(query.length * 0.35));
  return normalized
    .split(/[^a-z0-9@.]+/)
    .some(
      (word) =>
        Math.abs(word.length - query.length) <= threshold && editDistance(query, word) <= threshold,
    );
}

function editDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1)
      current[column] = Math.min(
        current[column - 1]! + 1,
        previous[column]! + 1,
        previous[column - 1]! + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length]!;
}

function Metric({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: number;
  icon: typeof Award;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase">{label}</p>
        <p className={`mt-2 text-3xl font-black ${accent ? 'text-[#FF5C00]' : 'text-gray-900'}`}>
          {value}
        </p>
      </div>
      <Icon className={`h-6 w-6 ${accent ? 'text-[#FF5C00]' : 'text-gray-400'}`} />
    </div>
  );
}
