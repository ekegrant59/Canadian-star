'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpDown, ChevronDown, Eye, Search } from 'lucide-react';
import type { AdminApplicationRecord } from '@/server/queries/admin';
import { ProfileImage } from '@/components/shared/profile-image';

const lifecycleLabels: Record<AdminApplicationRecord['lifecycleStatus'], string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under review',
  approved: 'Approved',
  shortlisted: 'Semi-finalist',
  finalist: 'Finalist',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export function AdminApplicationsList({
  applications,
  showVoting = false,
}: {
  applications: AdminApplicationRecord[];
  showVoting?: boolean;
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'submissionDate' | 'stageName'>('submissionDate');
  const [sortAsc, setSortAsc] = useState(false);

  const filteredApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return applications
      .filter((app) => {
        const matchesSearch =
          !query ||
          app.stageName.toLowerCase().includes(query) ||
          app.fullName.toLowerCase().includes(query) ||
          app.location.toLowerCase().includes(query) ||
          app.email.toLowerCase().includes(query);
        return (
          matchesSearch &&
          (statusFilter === 'all' || app.lifecycleStatus === statusFilter) &&
          (typeFilter === 'all' || app.actType === typeFilter)
        );
      })
      .sort((a, b) => {
        if (showVoting && a.verifiedVotes !== b.verifiedVotes)
          return b.verifiedVotes - a.verifiedVotes;
        const comparison =
          sortField === 'stageName'
            ? a.stageName.localeCompare(b.stageName)
            : (a.submittedAt?.getTime() ?? 0) - (b.submittedAt?.getTime() ?? 0);
        return sortAsc ? comparison : -comparison;
      });
  }, [applications, searchQuery, showVoting, sortAsc, sortField, statusFilter, typeFilter]);

  return (
    <div className="space-y-6">
      <div className="relative w-full max-w-2xl">
        <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          placeholder="Search by artist, account name, town, or email..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-4 pl-10 text-sm text-gray-900 shadow-2xs focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00]/30 focus:outline-hidden"
        />
      </div>

      <div className="flex flex-col justify-between gap-4 pt-2 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
            ARTIST APPLICATIONS
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Review submitted applications and manage their competition status.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter}>
            <option value="all">All statuses</option>
            {Object.entries(lifecycleLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Artist Type" value={typeFilter} onChange={setTypeFilter}>
            <option value="all">All types</option>
            <option value="solo">Solo</option>
            <option value="duo">Duo</option>
            <option value="band">Band</option>
          </FilterSelect>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-xs">
            <thead className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold tracking-wider text-gray-400 uppercase">
              <tr>
                <th className="px-5 py-3.5">
                  <button
                    type="button"
                    className="flex items-center gap-1.5"
                    onClick={() => {
                      if (sortField === 'stageName') setSortAsc(!sortAsc);
                      else setSortField('stageName');
                    }}
                  >
                    Artist / Band <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3.5">Type</th>
                <th className="px-4 py-3.5">Location</th>
                <th className="px-4 py-3.5">Submitted</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Public profile</th>
                {showVoting && <th className="px-4 py-3.5">Votes</th>}
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredApplications.map((app) => (
                <tr
                  key={app.id}
                  className="cursor-pointer transition-colors hover:bg-gray-50/80"
                  onClick={() => router.push(`/admin/applications/${app.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      router.push(`/admin/applications/${app.id}`);
                    }
                  }}
                  tabIndex={0}
                  role="link"
                  aria-label={`Review ${app.stageName}`}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <ProfileImage
                        src={app.avatarUrl}
                        alt={app.stageName}
                        className="h-9 w-9 flex-shrink-0 rounded-full border border-gray-200"
                      />
                      <div>
                        <p className="font-bold text-gray-900">{app.stageName}</p>
                        <p className="text-[10px] text-gray-400">{app.applicationNumber}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 capitalize">{app.actType}</td>
                  <td className="px-4 py-3.5 text-gray-600">{app.location}</td>
                  <td className="px-4 py-3.5 text-gray-600">{app.submissionDate}</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={app.lifecycleStatus} />
                  </td>
                  <td className="px-4 py-3.5">
                    <ProfileStatusBadge status={app.profileStatus} />
                  </td>
                  {showVoting && (
                    <td className="px-4 py-3.5 font-black text-gray-900">
                      {app.verifiedVotes.toLocaleString()}
                    </td>
                  )}
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/admin/applications/${app.id}`}
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
                      title={`Review ${app.stageName}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-100 bg-gray-50/50 p-4 text-xs text-gray-500">
          Showing {filteredApplications.length} of {applications.length} applications
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-gray-500">
      {label}:
      <span className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="appearance-none rounded-lg border border-gray-200 bg-white py-1.5 pr-8 pl-3 text-xs font-semibold text-gray-700 shadow-2xs focus:ring-1 focus:ring-[#FF5C00] focus:outline-hidden"
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
      </span>
    </label>
  );
}

function StatusBadge({ status }: { status: AdminApplicationRecord['lifecycleStatus'] }) {
  const tone =
    status === 'rejected' || status === 'withdrawn'
      ? 'border-red-200 bg-red-50 text-red-700'
      : status === 'shortlisted' || status === 'finalist'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-orange-200 bg-orange-50 text-orange-700';
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${tone}`}
    >
      {lifecycleLabels[status]}
    </span>
  );
}

function ProfileStatusBadge({ status }: { status: AdminApplicationRecord['profileStatus'] }) {
  const tone =
    status === 'published'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : status === 'archived'
        ? 'border-gray-200 bg-gray-100 text-gray-600'
        : 'border-amber-200 bg-amber-50 text-amber-700';
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${tone}`}
    >
      {status}
    </span>
  );
}
