'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, Search, ArrowUpRight, ArrowDownRight, Minus, TrendingUp } from 'lucide-react';
type LeaderboardArtistItem = {
  id: string;
  applicationId: string;
  rank: number;
  name: string;
  genre: string;
  avatarUrl: string | null;
  initials: string;
  totalVotes: number;
  flaggedVotes: number;
  pendingVotes: number;
  votePercentage: number;
  momentum: 'up' | 'down' | 'steady';
  qualifyingShow?: string;
};
type Metrics = {
  totalVotesCast: number;
  totalAttempts: number;
  verifiedVoters: number;
  flaggedVotes: number;
  invalidatedVotes: number;
  votingWindow: { startsAt: Date; endsAt: Date; label: string } | null;
  isVotingOpen: boolean;
};

export function ArtistLeaderboardView({
  artists,
  metrics,
}: {
  artists: LeaderboardArtistItem[];
  metrics: Metrics;
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [visibleCount, setVisibleCount] = useState(10);
  const [exportedToast, setExportedToast] = useState(false);

  const genres = useMemo(() => {
    const set = new Set<string>();
    artists.forEach((a) => set.add(a.genre));
    return ['all', ...Array.from(set)];
  }, [artists]);

  const filteredArtists = useMemo(() => {
    return artists.filter((artist) => {
      const matchesSearch =
        artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artist.genre.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGenre =
        selectedGenre === 'all' || artist.genre.toLowerCase() === selectedGenre.toLowerCase();
      return matchesSearch && matchesGenre;
    });
  }, [artists, searchQuery, selectedGenre]);

  const voteShareDistribution = artists
    .slice(0, 30)
    .map((artist, index) => ({
      applicationId: artist.applicationId,
      label: artist.name,
      percentage: artist.votePercentage,
      color: SHARE_COLORS[index % SHARE_COLORS.length]!,
    }));
  const leader = artists[0];

  const displayedArtists = filteredArtists.slice(0, visibleCount);

  const handleExportCSV = () => {
    const headers = ['Rank', 'Artist Name', 'Genre', 'Total Votes', 'Percentage', 'Momentum'];
    const rows = filteredArtists.map((a) => [
      a.rank,
      `"${a.name}"`,
      `"${a.genre}"`,
      a.totalVotes,
      `${a.votePercentage}%`,
      a.momentum,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `canadian_star_artist_leaderboard_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportedToast(true);
    setTimeout(() => setExportedToast(false), 3500);
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#FDE68A] bg-[#FEF3C7] text-sm font-bold text-[#D97706] shadow-2xs">
          1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E2E8F0] bg-[#F1F5F9] text-sm font-bold text-[#475569] shadow-2xs">
          2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#FED7AA] bg-[#FFEDD5] text-sm font-bold text-[#C2410C] shadow-2xs">
          3
        </span>
      );
    }
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F4F6] text-sm font-semibold text-[#4B5563]">
        {rank}
      </span>
    );
  };

  const getMomentumIcon = (momentum: LeaderboardArtistItem['momentum']) => {
    if (momentum === 'up') {
      return <ArrowUpRight className="h-5 w-5 text-[#12B76A]" />;
    }
    if (momentum === 'down') {
      return <ArrowDownRight className="h-5 w-5 text-[#EF4444]" />;
    }
    return <Minus className="h-4 w-4 text-[#F59E0B]" />;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {exportedToast && (
        <div className="animate-in fade-in slide-in-from-bottom-5 fixed right-6 bottom-6 z-50 flex items-center gap-3 rounded-xl border border-[#2a2a2a] bg-[#161616] px-5 py-3 text-white shadow-2xl">
          <div className="h-2.5 w-2.5 rounded-full bg-[#12B76A]" />
          <p className="text-sm font-medium">Artist standings CSV exported successfully.</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#111827] lg:text-3xl">
            Artist Leaderboard
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#12B76A]" />
            <p className="text-xs text-[#6B7280] sm:text-sm">
              Live Standings · Last Updated: Just now
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="inline-flex cursor-pointer items-center justify-center gap-2 self-start rounded-lg border border-[#D1D5DB] bg-white px-4 py-2.5 text-sm font-semibold text-[#1F2937] shadow-xs transition-colors hover:bg-[#F9FAFB] sm:self-auto"
        >
          <Download className="h-4 w-4 text-[#4B5563]" />
          <span>Export Standings</span>
        </button>
      </div>

      {/* Metric Cards Row (3 Cards) */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* Card 1: Total Votes Cast */}
        <div className="flex flex-col justify-between rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xs">
          <div>
            <p className="text-xs font-semibold tracking-wider text-[#6B7280] uppercase">
              Total Votes Cast
            </p>
            <p className="mt-2 text-3xl font-extrabold text-[#111827] lg:text-4xl">
              {metrics.totalVotesCast.toLocaleString()}
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-[#12B76A]">
            <TrendingUp className="h-4 w-4" />
            <span>{metrics.flaggedVotes} flagged votes under review</span>
          </div>
        </div>

        {/* Card 2: Current Leader */}
        <div className="flex flex-col justify-between rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xs">
          <div>
            <p className="text-xs font-semibold tracking-wider text-[#6B7280] uppercase">
              Current Leader
            </p>
            <p className="mt-1.5 text-2xl font-bold text-[#111827]">
              {leader?.name ?? 'No verified votes'}
            </p>
            <p className="mt-0.5 text-xs font-medium text-[#6B7280]">
              {(leader?.totalVotes ?? 0).toLocaleString()} Votes ({leader?.votePercentage ?? 0}%)
            </p>
          </div>
          <div className="mt-4">
            <span className="inline-block rounded-md border border-[#E2E8F0] bg-[#F1F5F9] px-2.5 py-1 text-xs font-medium text-[#475569]">
              {leader?.genre ?? 'Voting roster'}
            </span>
          </div>
        </div>

        {/* Card 3: Current Phase Closes */}
        <div className="flex flex-col justify-between rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xs">
          <div>
            <p className="text-xs font-semibold tracking-wider text-[#6B7280] uppercase">
              Current Phase Closes
            </p>
            <p className="mt-1.5 text-2xl font-bold text-[#111827]">
              {metrics.votingWindow ? formatDate(metrics.votingWindow.endsAt) : 'Not scheduled'}
            </p>
            <p className="mt-0.5 text-xs font-medium text-[#6B7280]">
              {metrics.isVotingOpen ? 'Voting is open' : 'Voting is closed'}
            </p>
          </div>
          {/* Styled Orange Progress Bar */}
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
              <div
                className="h-full rounded-full bg-[#FF5C00] transition-all duration-500"
                style={{ width: '58%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Share of Vote (Top 30) Card */}
      <div className="space-y-4 rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-xs">
        <h2 className="text-base font-bold text-[#111827]">Share of Vote (Top 30)</h2>

        {/* Segmented Progress Bar */}
        <div className="flex h-8 w-full overflow-hidden rounded-lg shadow-2xs">
          {voteShareDistribution.map((segment) => (
            <div
              key={segment.label}
              style={{
                width: `${segment.percentage}%`,
                backgroundColor: segment.color,
              }}
              className="group relative h-full cursor-pointer transition-all duration-300"
              title={`${segment.label}: ${segment.percentage}%`}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-[#374151]">
          {voteShareDistribution.map((item) => (
            <Link
              key={item.applicationId}
              href={`/admin/applications/${item.applicationId}`}
              className="flex items-center gap-2 rounded-md font-medium hover:text-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00]/30 focus:outline-none"
            >
              <span
                className="h-3 w-3 shrink-0 rounded-xs"
                style={{ backgroundColor: item.color }}
              />
              <span>
                {item.label} <span className="text-[#6B7280]">{item.percentage}%</span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Search & Filters Toolbar */}
      <div className="flex flex-col justify-between gap-4 pt-2 md:flex-row md:items-center">
        <div className="flex max-w-xl flex-1 flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find artist by name..."
              className="w-full rounded-lg border border-[#D1D5DB] bg-white py-2 pr-4 pl-9 text-sm text-[#111827] placeholder-[#9CA3AF] focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00]/20 focus:outline-hidden"
            />
          </div>

          {/* Genre Filter */}
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="cursor-pointer rounded-lg border border-[#D1D5DB] bg-white px-3.5 py-2 text-sm font-medium text-[#374151] focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00]/20 focus:outline-hidden"
          >
            <option value="all">All Genres</option>
            {genres
              .filter((g) => g !== 'all')
              .map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
          </select>
        </div>

        {/* Results Counter */}
        <p className="self-end text-xs font-medium text-[#6B7280] md:self-center">
          Showing 1-{displayedArtists.length} of {filteredArtists.length} Artists
        </p>
      </div>

      {/* Leaderboard Table Card */}
      <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-xs font-semibold tracking-wider text-[#6B7280] uppercase">
                <th className="w-20 px-4 py-3.5 text-center sm:px-6">Rank</th>
                <th className="px-4 py-3.5 sm:px-6">Artist Name</th>
                <th className="px-4 py-3.5 sm:px-6">Genre/Category</th>
                <th className="px-4 py-3.5 text-right sm:px-6">Total Votes</th>
                <th className="px-4 py-3.5 text-right sm:px-6">% of Total</th>
                <th className="w-28 px-4 py-3.5 text-center sm:px-6">Momentum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {displayedArtists.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#6B7280]">
                    No artists found matching your criteria.
                  </td>
                </tr>
              ) : (
                displayedArtists.map((artist) => (
                  <tr
                    key={artist.id}
                    role="link"
                    tabIndex={0}
                    aria-label={`Open ${artist.name} application review`}
                    onClick={() => router.push(`/admin/applications/${artist.applicationId}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        router.push(`/admin/applications/${artist.applicationId}`);
                      }
                    }}
                    className="group cursor-pointer transition-colors hover:bg-[#F9FAFB] focus:bg-orange-50/50 focus:outline-none"
                  >
                    {/* Rank */}
                    <td className="px-4 py-4 text-center sm:px-6">
                      <div className="flex justify-center">{getRankBadge(artist.rank)}</div>
                    </td>

                    {/* Artist Name & Avatar */}
                    <td className="px-4 py-4 sm:px-6">
                      <div className="flex items-center gap-3.5">
                        {artist.avatarUrl ? (
                          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[#E5E7EB] bg-[#111]">
                            <Image
                              src={artist.avatarUrl}
                              alt={artist.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E5E7EB] text-xs font-bold text-[#4B5563]">
                            {artist.initials}
                          </div>
                        )}
                        <div>
                          <Link
                            href={`/admin/applications/${artist.applicationId}`}
                            onClick={(event) => event.stopPropagation()}
                            className="font-bold text-[#111827] transition-colors group-hover:text-[#FF5C00] hover:underline"
                          >
                            {artist.name}
                          </Link>
                          {artist.qualifyingShow && (
                            <p className="text-[11px] text-[#9CA3AF]">{artist.qualifyingShow}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Genre / Category */}
                    <td className="px-4 py-4 text-[#4B5563] sm:px-6">{artist.genre}</td>

                    {/* Total Votes */}
                    <td className="px-4 py-4 text-right font-extrabold text-[#111827] sm:px-6">
                      {artist.totalVotes.toLocaleString()}
                    </td>

                    {/* % of Total */}
                    <td className="px-4 py-4 text-right font-medium text-[#4B5563] sm:px-6">
                      {artist.votePercentage}%
                    </td>

                    {/* Momentum */}
                    <td className="px-4 py-4 text-center sm:px-6">
                      <div className="flex justify-center">{getMomentumIcon(artist.momentum)}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Load More Centered Action */}
        {visibleCount < filteredArtists.length && (
          <div className="border-t border-[#E5E7EB] bg-[#FAFAFA] p-4 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 5)}
              className="cursor-pointer px-4 py-1 text-xs font-bold tracking-wider text-[#FF5C00] uppercase transition-colors hover:text-[#E05200]"
            >
              LOAD MORE ARTISTS
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const SHARE_COLORS = ['#FF5C00', '#F79009', '#12B76A', '#7F56D9', '#2E90FA', '#667085'];

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(new Date(value));
}
