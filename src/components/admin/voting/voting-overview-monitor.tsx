'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TrendingUp, ShieldCheck, Clock, BarChart3 } from 'lucide-react';
import { ArtistLeaderboardView } from './artist-leaderboard-view';
import type { AdminVoteActivity } from '@/server/queries/admin';

type Metrics = {
  totalVotesCast: number;
  totalAttempts: number;
  verifiedVoters: number;
  flaggedVotes: number;
  invalidatedVotes: number;
  votingWindow: { startsAt: Date; endsAt: Date; label: string } | null;
  isVotingOpen: boolean;
};
type Leaderboard = Parameters<typeof ArtistLeaderboardView>[0]['artists'];

interface VotingOverviewMonitorProps {
  initialTab?: 'live' | 'leaderboard';
  metrics: Metrics;
  activity: AdminVoteActivity[];
  leaderboard: Leaderboard;
}

export function VotingOverviewMonitor({
  initialTab = 'live',
  metrics,
  activity,
  leaderboard,
}: VotingOverviewMonitorProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'live' | 'leaderboard'>(initialTab);
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'flagged' | 'blocked'>(
    'all',
  );
  const [showAllActivity, setShowAllActivity] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => router.refresh(), 15_000);
    return () => window.clearInterval(interval);
  }, [router]);

  const filteredVotes = useMemo(() => {
    if (statusFilter === 'all') return activity;
    return activity.filter((v) => v.status === statusFilter);
  }, [activity, statusFilter]);

  const displayedVotes = showAllActivity ? filteredVotes : filteredVotes.slice(0, 4);

  const getStatusBadge = (status: AdminVoteActivity['status']) => {
    if (status === 'verified') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F9F0] px-3 py-1 text-xs font-semibold text-[#12B76A]">
          Verified
        </span>
      );
    }
    if (status === 'flagged') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3EB] px-3 py-1 text-xs font-semibold text-[#F79009]">
          Flagged
        </span>
      );
    }
    if (status === 'pending')
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F4F6] px-3 py-1 text-xs font-semibold text-[#6B7280]">
          Pending OTP
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEE4E2] px-3 py-1 text-xs font-semibold text-[#F04438]">
        Blocked
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Pill Tabs Switcher */}
      <div className="flex w-fit items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#F3F4F6] p-1">
        <button
          type="button"
          onClick={() => setActiveTab('live')}
          className={`cursor-pointer rounded-md px-4 py-1.5 text-xs font-bold transition-all ${
            activeTab === 'live'
              ? 'bg-white text-[#111827] shadow-xs'
              : 'text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          Live Vote
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('leaderboard')}
          className={`cursor-pointer rounded-md px-4 py-1.5 text-xs font-bold transition-all ${
            activeTab === 'leaderboard'
              ? 'bg-white text-[#111827] shadow-xs'
              : 'text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          Artist Leaderboard
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'leaderboard' ? (
        <ArtistLeaderboardView artists={leaderboard} metrics={metrics} />
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-[#111827] lg:text-3xl">
                Voting Overview
              </h1>
              <p className="mt-1 text-xs text-[#6B7280] sm:text-sm">
                Integrity monitoring and operational controls.
              </p>
            </div>
          </div>

          {/* Metric Cards Row (3 Cards) */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {/* Card 1: TOTAL VOTES CAST */}
            <div className="flex flex-col justify-between rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-wider text-[#6B7280] uppercase">
                    TOTAL VOTES CAST
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-[#111827] lg:text-4xl">
                    {metrics.totalVotesCast.toLocaleString()}
                  </p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FEF3EB] text-[#FF5C00]">
                  <BarChart3 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-[#12B76A]">
                <TrendingUp className="h-4 w-4" />
                <span>{metrics.flaggedVotes} flagged for review</span>
              </div>
            </div>

            {/* Card 2: VERIFIED VOTERS */}
            <div className="flex flex-col justify-between rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-wider text-[#6B7280] uppercase">
                    VERIFIED VOTERS
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-[#111827] lg:text-4xl">
                    {metrics.verifiedVoters.toLocaleString()}
                  </p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E6F9F0] text-[#12B76A]">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-4 text-xs font-medium text-[#6B7280]">
                {metrics.totalAttempts
                  ? `${Math.round((metrics.verifiedVoters / metrics.totalAttempts) * 100)}%`
                  : '0%'}{' '}
                Verification Rate
              </p>
            </div>

            {/* Card 3: ACTIVE VOTING WINDOW */}
            <div className="flex flex-col justify-between rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-wider text-[#6B7280] uppercase">
                    ACTIVE VOTING WINDOW
                  </p>
                  <p className="mt-2 text-xl font-bold text-[#111827] lg:text-2xl">
                    {metrics.votingWindow?.label ?? 'No voting phase'}
                  </p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#FFD8BF] bg-[#FFF9F5] text-[#FF5C00]">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-[#FF5C00]">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {metrics.votingWindow
                    ? `Closes ${formatDate(metrics.votingWindow.endsAt)}`
                    : 'Not scheduled'}
                </span>
              </div>
            </div>
          </div>

          {/* Live Vote Monitoring Section */}
          <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xs">
            {/* Card Header with Status Filter */}
            <div className="flex flex-col justify-between gap-3 border-b border-[#E5E7EB] p-5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <span className="text-[#FF5C00]">
                  <BarChart3 className="h-5 w-5" />
                </span>
                <h2 className="text-base font-bold text-[#111827]">Live Vote Monitoring</h2>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="cursor-pointer rounded-lg border border-[#D1D5DB] bg-white px-3 py-1.5 text-xs font-medium text-[#374151] focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00]/20 focus:outline-hidden"
                >
                  <option value="all">All Statuses</option>
                  <option value="verified">Verified</option>
                  <option value="flagged">Flagged</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
            </div>

            {/* Activity Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-xs font-semibold tracking-wider text-[#6B7280] uppercase">
                    <th className="px-4 py-3.5 sm:px-6">VOTER EMAIL</th>
                    <th className="px-4 py-3.5 sm:px-6">TARGET ARTIST</th>
                    <th className="px-4 py-3.5 sm:px-6">TIMESTAMP</th>
                    <th className="px-4 py-3.5 text-center sm:px-6">STATUS</th>
                    <th className="px-4 py-3.5 text-right sm:px-6">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {displayedVotes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#6B7280]">
                        No voting activity matches the selected filter.
                      </td>
                    </tr>
                  ) : (
                    displayedVotes.map((vote) => (
                      <tr key={vote.id} className="transition-colors hover:bg-[#F9FAFB]">
                        {/* Voter Email */}
                        <td className="px-4 py-4 font-medium text-[#111827] sm:px-6">
                          {vote.voterEmail}
                        </td>

                        {/* Target Artist */}
                        <td className="px-4 py-4 text-[#374151] sm:px-6">
                          <Link
                            href={`/admin/applications/${vote.applicationId}`}
                            className="font-bold hover:text-[#FF5C00] hover:underline"
                          >
                            {vote.targetArtistName}
                          </Link>
                        </td>

                        {/* Timestamp */}
                        <td className="px-4 py-4 text-xs text-[#6B7280] sm:px-6">
                          {formatVoteTimestamp(vote.timestamp)}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4 text-center sm:px-6">
                          {getStatusBadge(vote.status)}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4 text-right sm:px-6">
                          <Link
                            href={`/admin/voting/integrity/${vote.id}`}
                            className="cursor-pointer text-xs font-bold text-[#FF5C00] hover:text-[#E05200] hover:underline"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* View All Live Activity Footer Action */}
            <div className="border-t border-[#E5E7EB] bg-[#FAFAFA] p-4 text-center">
              <button
                type="button"
                onClick={() => setShowAllActivity(!showAllActivity)}
                className="cursor-pointer px-4 py-1 text-xs font-bold tracking-wide text-[#FF5C00] transition-colors hover:text-[#E05200]"
              >
                {showAllActivity ? 'Show Recent Activity Only' : 'View All Live Activity'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function formatVoteTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}
