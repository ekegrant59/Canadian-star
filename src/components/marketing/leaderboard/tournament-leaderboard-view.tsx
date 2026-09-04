'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Trophy, CheckCircle2, ArrowRight, User, SlidersHorizontal } from 'lucide-react';
import {
  ALL_TOURNAMENT_PRESETS,
  PRESET_ACTIVE_BATTLE,
  TournamentShow,
  GrandFinaleInfo,
  TournamentStateData,
} from '@/data/tournament-leaderboard';

export function TournamentLeaderboardView({ initialData }: { initialData?: TournamentStateData }) {
  const [selectedPhaseKey, setSelectedPhaseKey] = useState<string>(
    initialData?.phaseKey ?? 'active',
  );

  const currentData =
    initialData ??
    ALL_TOURNAMENT_PRESETS.find((p) => p.phaseKey === selectedPhaseKey) ??
    PRESET_ACTIVE_BATTLE;

  const show1 = currentData.shows[0];
  const show2 = currentData.shows[1];
  const show3 = currentData.shows[2];
  const show4 = currentData.shows[3];
  const finale = currentData.grandFinale;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0a] pt-24 pb-20 text-white">
      {/* Background Ambience & Arena Glow */}
      <div className="pointer-events-none absolute top-1/4 left-1/2 h-[500px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF5C00]/[0.04] blur-[150px]" />
      <div className="pointer-events-none absolute top-10 left-10 h-96 w-96 rounded-full bg-amber-500/[0.02] blur-[120px]" />

      <div className="container-content relative z-10 px-4 sm:px-6 lg:px-8">
        {/* Top Header / Hero Matching leaderboard.svg & Main.svg */}
        <div className="mx-auto mb-10 max-w-4xl text-center lg:text-left">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#2A2A2A] bg-[#181818] px-3 py-1 text-[11px] font-bold tracking-widest text-[#FF9B70] uppercase shadow-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#FF5C00]" />
            <span>{currentData.kicker}</span>
          </div>

          <h1 className="mb-4 text-3xl leading-[1.05] font-black tracking-tight text-white uppercase sm:text-5xl lg:text-6xl">
            {currentData.headline}
          </h1>

          <p className="max-w-2xl text-sm leading-relaxed text-[#B0A8A4] sm:text-base">
            {currentData.subhead}
          </p>

          {/* Interactive State / Phase Simulator Toolbar */}
          {!initialData && (
            <div className="mt-7 flex flex-col justify-between gap-3 border-t border-[#1F1F1F] pt-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#888]">
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#FF5C00]" />
                <span>Simulate Tournament Phase:</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#242424] bg-[#141414] p-1">
                {ALL_TOURNAMENT_PRESETS.map((preset) => {
                  const isActive = preset.phaseKey === selectedPhaseKey;
                  return (
                    <button
                      key={preset.phaseKey}
                      type="button"
                      onClick={() => setSelectedPhaseKey(preset.phaseKey)}
                      className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-[#FF5C00] text-white shadow-md shadow-[#FF5C00]/20'
                          : 'text-[#888] hover:bg-[#1f1f1f] hover:text-white'
                      }`}
                    >
                      {preset.phaseLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* DESKTOP TOURNAMENT BRACKET (3-Column Layout Matching leaderboard.svg) */}
        {/* ------------------------------------------------------------------ */}
        <div className="my-8 hidden grid-cols-12 items-center gap-6 lg:grid">
          {/* LEFT COLUMN: Show 1 & Show 2 (4 cols) */}
          <div className="col-span-4 space-y-6">
            {show1 && <ShowCard show={show1} />}
            {show2 && <ShowCard show={show2} />}
          </div>

          {/* CENTER COLUMN: The Grand Finale Radial Hub (4 cols) */}
          <div className="relative col-span-4 flex flex-col items-center justify-center py-6">
            <GrandFinaleHub finale={finale} />
          </div>

          {/* RIGHT COLUMN: Show 3 & Show 4 (4 cols) */}
          <div className="col-span-4 space-y-6">
            {show3 && <ShowCard show={show3} isLiveHighlight={show3.status === 'live'} />}
            {show4 && <ShowCard show={show4} isLiveHighlight={show4.status === 'live'} />}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* TABLET TOURNAMENT BRACKET (2-Column + Center Hub for 768px-1023px) */}
        {/* ------------------------------------------------------------------ */}
        <div className="mx-auto my-8 hidden max-w-3xl space-y-8 md:block lg:hidden">
          {/* Top Row: Shows 1 & 2 */}
          <div className="grid grid-cols-2 gap-5">
            {show1 && <ShowCard show={show1} />}
            {show2 && <ShowCard show={show2} />}
          </div>

          {/* Center Climax: Grand Finale Hub */}
          <div className="relative flex justify-center py-4">
            <GrandFinaleHub finale={finale} />
          </div>

          {/* Bottom Row: Shows 3 & 4 */}
          <div className="grid grid-cols-2 gap-5">
            {show3 && <ShowCard show={show3} isLiveHighlight={show3.status === 'live'} />}
            {show4 && <ShowCard show={show4} isLiveHighlight={show4.status === 'live'} />}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* MOBILE TOURNAMENT BRACKET (Vertical Flow with Full Details <768px) */}
        {/* ------------------------------------------------------------------ */}
        <div className="mx-auto my-6 max-w-md space-y-4 md:hidden">
          {show1 && (
            <>
              <ShowCardMobile show={show1} />
              <VerticalConnector />
            </>
          )}

          {show2 && (
            <>
              <ShowCardMobile show={show2} />
              <VerticalConnector />
            </>
          )}

          {show3 && (
            <>
              <ShowCardMobile show={show3} isLiveHighlight={show3.status === 'live'} />
              <VerticalConnector />
            </>
          )}

          {show4 && (
            <>
              <ShowCardMobile show={show4} isLiveHighlight={show4.status === 'live'} />
              <VerticalConnector />
            </>
          )}

          {/* Mobile Grand Finale Card at bottom */}
          <GrandFinaleMobile finale={finale} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DESKTOP SHOW CARD COMPONENT
// ---------------------------------------------------------------------------
function ShowCard({
  show,
  isLiveHighlight = false,
}: {
  show: TournamentShow;
  isLiveHighlight?: boolean;
}) {
  const isCompleted = show.status === 'completed';
  const isLive = show.status === 'live';
  const isPending = show.status === 'pending';

  return (
    <article
      className={`relative overflow-hidden rounded-2xl transition-all duration-200 ${
        isLive || isLiveHighlight
          ? 'border border-[#FF5C00] bg-[#151210] shadow-[0_0_30px_rgba(255,92,0,0.14)] ring-1 ring-[#FF5C00]/40'
          : 'border border-[#222] bg-[#141414] hover:border-[#2e2e2e]'
      } p-5`}
    >
      {/* Top Card Header */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              isLive
                ? 'animate-pulse bg-[#FF5C00] shadow-[0_0_8px_#FF5C00]'
                : isCompleted
                  ? 'bg-amber-400'
                  : 'bg-gray-500'
            }`}
          />
          <h2 className="text-xs font-black tracking-wider text-white uppercase">{show.title}</h2>
        </div>

        {/* Status Pill Badge */}
        <span
          className={`rounded-md px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase ${
            isLive
              ? 'bg-[#FF5C00] text-white shadow-xs'
              : isCompleted
                ? 'border border-[#F59E0B]/30 bg-[#2E2416] text-[#F59E0B]'
                : isPending
                  ? 'border border-[#333] bg-[#1c1c1c] text-gray-400'
                  : 'border border-[#333] bg-[#1f1f1f] text-gray-300'
          }`}
        >
          {show.statusLabel}
        </span>
      </div>

      {/* Venue & Date Line */}
      <p className="mb-4 text-[11px] font-semibold tracking-wide text-[#8E8682] uppercase">
        {show.venue} • {show.dateText}
      </p>

      {/* 1. COMPLETED STATE: Prominently feature the winner & list eliminated contenders */}
      {isCompleted && show.winner && (
        <div className="space-y-4">
          {/* Winner Featured Box */}
          <div className="group relative overflow-hidden rounded-xl border border-[#F59E0B]/40 bg-[#1C1712] p-3.5">
            <div className="flex items-center gap-3.5">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#F59E0B]/50 bg-black shadow-md">
                {show.winner.photoUrl ? (
                  <Image
                    src={show.winner.photoUrl}
                    alt={show.winner.name}
                    fill
                    unoptimized
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-500">
                    <User className="h-6 w-6" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-bold text-white transition-colors group-hover:text-[#FF9B70]">
                    {show.winner.name}
                  </span>
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#F59E0B]" />
                </div>

                <div className="mt-0.5 text-[11px] font-bold tracking-wider text-[#F59E0B] uppercase">
                  {show.winner.goldenTicketLabel ?? 'GOLDEN TICKET WINNER'}
                </div>

                <p className="mt-0.5 truncate text-[11px] text-gray-400">{show.winner.hometown}</p>
              </div>
            </div>
          </div>

          {/* Eliminated Contenders Section (Strictly NO votes or bars, clean text list) */}
          {show.contenders.filter((c) => c.status === 'eliminated').length > 0 && (
            <div className="border-t border-[#222] pt-2">
              <p className="mb-2 text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                Eliminated Contenders
              </p>
              <div className="space-y-1.5">
                {show.contenders
                  .filter((c) => c.status === 'eliminated')
                  .map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded bg-[#101010] px-2 py-1 text-xs text-[#7E7875]"
                    >
                      <span className="truncate">{c.name}</span>
                      <span className="text-[9px] font-bold tracking-wider text-gray-500 uppercase">
                        ELIMINATED
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isCompleted && !show.winner && (
        <div className="space-y-3 rounded-xl border border-dashed border-[#F59E0B]/40 bg-[#1C1712] p-4">
          <div>
            <p className="text-xs font-black tracking-wider text-[#F59E0B] uppercase">
              Result pending
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#B0A8A4]">
              The show is complete, but the winning artist has not been recorded yet.
            </p>
          </div>
          {show.contenders.length > 0 && (
            <div className="space-y-1.5 border-t border-[#3A2A1A] pt-3">
              {show.contenders.map((contender) => (
                <div
                  key={contender.id}
                  className="flex items-center justify-between rounded bg-[#101010] px-2 py-1 text-xs text-[#A89F9A]"
                >
                  <span className="truncate">{contender.name}</span>
                  <span className="text-[9px] font-bold tracking-wider text-gray-500 uppercase">
                    Awaiting result
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. LIVE STATE: All 4 contenders actively competing */}
      {isLive && (
        <div className="space-y-2">
          {show.contenders.map((contender) => (
            <Link
              key={contender.id}
              href={contender.slug ? `/artists/${contender.slug}` : '#'}
              className="group flex items-center gap-3 rounded-xl border border-[#3A261C] bg-[#1E1713] p-2 transition-all hover:border-[#FF5C00]/60"
            >
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-[#FF5C00]/30 bg-black">
                {contender.photoUrl ? (
                  <Image
                    src={contender.photoUrl}
                    alt={contender.name}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-500">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-white transition-colors group-hover:text-[#FF5C00]">
                  {contender.name}
                </p>
                <p className="truncate text-[10px] text-[#A89F9A]">{contender.hometown}</p>
              </div>

              <span className="shrink-0 rounded border border-[#FF5C00]/20 bg-[#FF5C00]/10 px-2 py-0.5 text-[9px] font-bold text-[#FF9B70] uppercase">
                COMPETING
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* 3. UPCOMING / SCHEDULED STATE */}
      {!isCompleted && !isLive && !isPending && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {show.contenders.map((contender) => (
              <div
                key={contender.id}
                className="rounded-xl border border-[#222] bg-[#111] p-2.5 text-center"
              >
                <div className="relative mx-auto mb-1.5 h-8 w-8 overflow-hidden rounded-full border border-white/10 bg-[#1c1c1c]">
                  {contender.photoUrl ? (
                    <Image
                      src={contender.photoUrl}
                      alt={contender.name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-500">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <p className="truncate text-xs font-bold text-white">{contender.name}</p>
                <p className="truncate text-[10px] text-gray-500">{contender.hometown}</p>
              </div>
            ))}
          </div>

          <div className="pt-2 text-center">
            <Link
              href={show.ticketUrl || '#schedule'}
              target={show.ticketUrl?.startsWith('http') ? '_blank' : undefined}
              rel={show.ticketUrl?.startsWith('http') ? 'noreferrer' : undefined}
              className="inline-flex items-center gap-1 text-xs font-bold tracking-wider text-[#FF9B70] uppercase transition-colors hover:text-white"
            >
              <span>Get Show {show.showNumber} Tickets</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* 4. PENDING SELECTION STATE (Contenders not yet chosen) */}
      {isPending && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((idx) => (
              <div
                key={idx}
                className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#282828] bg-[#101010] p-3 py-4 text-center"
              >
                <div className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#181818] text-gray-600">
                  <User className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-semibold text-gray-400">Contender #{idx}</span>
                <span className="text-[9px] text-gray-600 uppercase">TBD</span>
              </div>
            ))}
          </div>
          <p className="text-center text-[11px] text-gray-500 italic">
            Contestant lineup will be published following audition evaluations.
          </p>
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// DESKTOP GRAND FINALE RADIAL HUB COMPONENT
// ---------------------------------------------------------------------------
function GrandFinaleHub({ finale }: { finale: GrandFinaleInfo }) {
  const isCrowned = finale.status === 'completed' && Boolean(finale.winner);

  return (
    <div className="relative flex w-full flex-col items-center justify-center">
      {/* Orbital / Dashed Decorative Rings matching Figma design */}
      <div className="animate-spin-slow pointer-events-none absolute -z-0 h-[420px] w-[420px] rounded-full border border-dashed border-[#FF5C00]/20 opacity-60" />
      <div className="pointer-events-none absolute -z-0 h-[340px] w-[340px] rounded-full border border-dashed border-white/10" />

      {/* Center Main Card */}
      <div className="relative z-10 w-full max-w-[330px] space-y-5 rounded-3xl border border-[#2b2b2b] bg-[#121212]/95 p-7 text-center shadow-2xl backdrop-blur-xl">
        {/* Trophy / Laurel Icon */}
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[#FF5C00]/30 bg-[#FF5C00]/10 shadow-lg">
          <Trophy className="h-7 w-7 text-[#FF5C00]" />
        </div>

        {/* Title */}
        <div>
          <h2 className="text-3xl leading-none font-black tracking-tight text-white uppercase">
            GRAND
          </h2>
          <h2 className="mt-1 text-3xl leading-none font-black tracking-tight text-[#FF5C00] uppercase">
            FINALE
          </h2>
          <p className="mt-3 text-[11px] font-bold tracking-widest text-gray-400 uppercase">
            {finale.headline}
          </p>
        </div>

        {/* Champion Showcase if Final Winner is Decided */}
        {isCrowned && finale.winner ? (
          <div className="space-y-2 rounded-2xl border border-amber-500/50 bg-[#1F1912] p-3 text-center">
            <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-black uppercase">
              OFFICIAL CHAMPION
            </span>
            <div className="relative mx-auto h-16 w-16 overflow-hidden rounded-full border-2 border-amber-400 shadow-md">
              <Image
                src={finale.winner.photoUrl}
                alt={finale.winner.name}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
            <h3 className="text-sm font-black text-white uppercase">{finale.winner.name}</h3>
            <p className="text-[11px] font-semibold text-[#FFB59A]">{finale.winner.hometown}</p>
          </div>
        ) : (
          /* 4 Finalist Qualifier Slots */
          <div>
            <div className="mb-2 grid grid-cols-4 gap-2">
              {finale.finalists.map((finalist, idx) => (
                <div key={idx} className="group text-center">
                  <div
                    className={`relative mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl transition-all ${
                      finalist
                        ? 'border-2 border-[#F59E0B] bg-black shadow-md shadow-amber-500/20'
                        : 'border border-dashed border-[#333] bg-[#1a1a1a] text-gray-600'
                    }`}
                  >
                    {finalist?.photoUrl ? (
                      <Image
                        src={finalist.photoUrl}
                        alt={finalist.name}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-xs font-black">?</span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-[9px] font-bold text-gray-400 uppercase">
                    {finalist ? finalist.name.split(' ')[0] : `Show ${idx + 1}`}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-[10px] tracking-wider text-gray-500 uppercase">
              {finale.finalists.filter(Boolean).length} OF 4 FINALISTS CLINCHED
            </p>
          </div>
        )}

        {/* Date & Venue Footer */}
        <div className="border-t border-[#222] pt-3">
          <p className="text-[10px] font-bold tracking-wider text-[#8E8682] uppercase">
            {finale.dateText}
          </p>
          <p className="mt-0.5 text-[10px] text-gray-500 uppercase">{finale.venue}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MOBILE SHOW CARD COMPONENT (Matching Main.svg with full details)
// ---------------------------------------------------------------------------
function ShowCardMobile({
  show,
  isLiveHighlight = false,
}: {
  show: TournamentShow;
  isLiveHighlight?: boolean;
}) {
  const isCompleted = show.status === 'completed';
  const isLive = show.status === 'live';
  const isPending = show.status === 'pending';

  return (
    <article
      className={`relative overflow-hidden rounded-2xl p-5 transition-all ${
        isLive || isLiveHighlight
          ? 'border border-[#FF5C00] bg-[#151210] shadow-lg ring-1 shadow-[#FF5C00]/10 ring-[#FF5C00]/30'
          : 'border border-[#222] bg-[#141414]'
      }`}
    >
      {/* Mobile Show Header */}
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              isLive ? 'animate-pulse bg-[#FF5C00]' : isCompleted ? 'bg-amber-400' : 'bg-gray-500'
            }`}
          />
          <span className="text-[11px] font-extrabold tracking-wider text-white uppercase">
            SHOW {show.showNumber} • {show.city}
          </span>
        </div>

        <span
          className={`rounded px-2 py-0.5 text-[9px] font-extrabold tracking-wider uppercase ${
            isLive
              ? 'bg-[#FF5C00] text-white shadow-xs'
              : isCompleted
                ? 'border border-[#F59E0B]/30 bg-[#2E2416] text-[#F59E0B]'
                : isPending
                  ? 'border border-[#333] bg-[#1c1c1c] text-gray-400'
                  : 'border border-[#333] bg-[#1f1f1f] text-gray-300'
          }`}
        >
          {isLive ? '• LIVE NOW' : show.statusLabel}
        </span>
      </div>

      {/* Full Venue & Date Info (Preserved from Desktop) */}
      <p className="mb-3.5 text-[11px] font-semibold tracking-wide text-[#8E8682] uppercase">
        {show.venue} • {show.dateText}
      </p>

      {/* 1. Content for Completed Show: Full Winner Details & Eliminated List */}
      {isCompleted && show.winner && (
        <div className="space-y-3">
          {/* Winner Card with Verified Badge, Golden Ticket & Hometown */}
          <div className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-[#F59E0B]/40 bg-[#1D1712] p-3">
            <div className="relative h-13 w-13 shrink-0 overflow-hidden rounded-lg border border-[#F59E0B]/50 bg-black">
              {show.winner.photoUrl ? (
                <Image
                  src={show.winner.photoUrl}
                  alt={show.winner.name}
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-500">
                  <User className="h-5 w-5" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-bold text-white">{show.winner.name}</span>
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#F59E0B]" />
              </div>

              <div className="mt-0.5 text-[10px] font-extrabold tracking-wider text-[#F59E0B] uppercase">
                {show.winner.goldenTicketLabel ?? 'GOLDEN TICKET WINNER'}
              </div>

              <p className="mt-0.5 truncate text-[10px] text-gray-400">{show.winner.hometown}</p>
            </div>
          </div>

          {/* Eliminated Contenders in 2 columns (Strictly NO votes or bars) */}
          {show.contenders.filter((c) => c.status === 'eliminated').length > 0 && (
            <div>
              <p className="mb-1.5 text-[9px] font-bold tracking-widest text-gray-500 uppercase">
                Eliminated Contenders
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {show.contenders
                  .filter((c) => c.status === 'eliminated')
                  .map((c) => (
                    <div
                      key={c.id}
                      className="rounded-lg border border-[#222] bg-[#0e0e0e] p-1.5 text-[11px] text-gray-300 opacity-70"
                    >
                      <span className="block truncate font-medium">{c.name}</span>
                      <span className="mt-0.5 block text-[8px] font-bold text-gray-500 uppercase">
                        ELIMINATED
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isCompleted && !show.winner && (
        <div className="space-y-3 rounded-xl border border-dashed border-[#F59E0B]/40 bg-[#1D1712] p-3">
          <div>
            <p className="text-[10px] font-extrabold tracking-wider text-[#F59E0B] uppercase">
              Result pending
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-gray-400">
              The show is complete, but the winning artist has not been recorded yet.
            </p>
          </div>
          {show.contenders.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5 border-t border-[#3A2A1A] pt-3">
              {show.contenders.map((contender) => (
                <div
                  key={contender.id}
                  className="rounded-lg border border-[#222] bg-[#0e0e0e] p-1.5 text-[11px] text-gray-300"
                >
                  <span className="block truncate font-medium">{contender.name}</span>
                  <span className="mt-0.5 block text-[8px] font-bold text-gray-500 uppercase">
                    Awaiting result
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Content for Live Show: All competing artists with profile links & locations */}
      {isLive && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {show.contenders.map((contender) => (
              <Link
                key={contender.id}
                href={contender.slug ? `/artists/${contender.slug}` : '#'}
                className="group flex items-center gap-2.5 rounded-xl border border-[#3A261C] bg-[#1E1713] p-2.5 transition-all hover:border-[#FF5C00]/60"
              >
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-[#FF5C00]/30 bg-black">
                  {contender.photoUrl ? (
                    <Image
                      src={contender.photoUrl}
                      alt={contender.name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-500">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-white transition-colors group-hover:text-[#FF5C00]">
                    {contender.name}
                  </p>
                  <p className="truncate text-[10px] text-[#A89F9A]">{contender.hometown}</p>
                </div>

                <span className="shrink-0 rounded border border-[#FF5C00]/20 bg-[#FF5C00]/10 px-1.5 py-0.5 text-[8px] font-bold text-[#FF9B70] uppercase">
                  LIVE
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 3. Content for Upcoming / Scheduled Show: Artists & Ticket Link */}
      {!isCompleted && !isLive && !isPending && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {show.contenders.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-[#222] bg-[#101010] p-2.5 text-center"
              >
                <div className="relative mx-auto mb-1 h-8 w-8 overflow-hidden rounded-full border border-white/10 bg-[#1c1c1c]">
                  {c.photoUrl ? (
                    <Image
                      src={c.photoUrl}
                      alt={c.name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-500">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <p className="truncate text-xs font-bold text-white">{c.name}</p>
                <p className="truncate text-[10px] text-gray-400">{c.hometown}</p>
              </div>
            ))}
          </div>

          <div className="pt-1 text-center">
            <Link
              href={show.ticketUrl || '#schedule'}
              target={show.ticketUrl?.startsWith('http') ? '_blank' : undefined}
              rel={show.ticketUrl?.startsWith('http') ? 'noreferrer' : undefined}
              className="inline-flex items-center gap-1 text-xs font-bold tracking-wider text-[#FF9B70] uppercase transition-colors hover:text-white"
            >
              <span>Get Show {show.showNumber} Tickets</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* 4. Content for Pending Selection State */}
      {isPending && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-dashed border-[#262626] bg-[#0e0e0e] p-3 text-center"
              >
                <User className="mx-auto mb-1 h-4 w-4 text-gray-600" />
                <span className="block text-[11px] font-semibold text-gray-400">
                  Contender #{i}
                </span>
                <span className="text-[9px] text-gray-600 uppercase">TBD</span>
              </div>
            ))}
          </div>
          <p className="mt-1 text-center text-[10px] text-gray-500 italic">
            Contestant lineup will be published following audition evaluations.
          </p>
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// MOBILE GRAND FINALE CARD (Matching bottom card in Main.svg with full details)
// ---------------------------------------------------------------------------
function GrandFinaleMobile({ finale }: { finale: GrandFinaleInfo }) {
  const isCrowned = finale.status === 'completed' && Boolean(finale.winner);

  return (
    <div className="space-y-4 rounded-2xl border border-[#262626] bg-[#141414] p-6 text-center shadow-xl">
      {/* Trophy Icon */}
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-[#FF5C00]/30 bg-[#FF5C00]/10 text-[#FF5C00] shadow-md">
        <Trophy className="h-5 w-5" />
      </div>

      {/* Titles */}
      <div>
        <h2 className="text-2xl leading-tight font-black tracking-tight text-white uppercase">
          The Grand Finale
        </h2>
        <p className="mt-1 text-[11px] font-bold tracking-widest text-[#FF9B70] uppercase">
          {finale.headline}
        </p>
        <p className="mt-1 text-[11px] font-semibold tracking-wide text-[#8E8682] uppercase">
          {finale.venue} • {finale.dateText}
        </p>
      </div>

      {/* Champion Showcase if finale completed */}
      {isCrowned && finale.winner ? (
        <div className="space-y-2 rounded-xl border border-amber-500/50 bg-[#1F1912] p-3.5">
          <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[9px] font-extrabold tracking-wider text-black uppercase">
            OFFICIAL CHAMPION
          </span>
          <div className="relative mx-auto h-14 w-14 overflow-hidden rounded-full border-2 border-amber-400 shadow-md">
            <Image
              src={finale.winner.photoUrl}
              alt={finale.winner.name}
              fill
              unoptimized
              className="object-cover"
            />
          </div>
          <h3 className="text-xs font-black text-white uppercase">{finale.winner.name}</h3>
          <p className="text-[10px] font-semibold text-[#FFB59A]">{finale.winner.hometown}</p>
        </div>
      ) : (
        <div>
          {/* 4 Finalist Qualifier Slots with Names */}
          <div className="mb-2 grid grid-cols-4 gap-2">
            {finale.finalists.map((f, idx) => (
              <div key={idx} className="text-center">
                <div
                  className={`relative mx-auto flex h-13 w-13 items-center justify-center overflow-hidden rounded-xl ${
                    f
                      ? 'border-2 border-amber-400 bg-black shadow'
                      : 'border border-dashed border-[#333] bg-[#111] font-bold text-gray-600'
                  }`}
                >
                  {f?.photoUrl ? (
                    <Image
                      src={f.photoUrl}
                      alt={f.name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-xs font-black">?</span>
                  )}
                </div>
                <p className="mt-1 truncate text-[9px] font-bold text-gray-400 uppercase">
                  {f ? f.name.split(' ')[0] : `Show ${idx + 1}`}
                </p>
              </div>
            ))}
          </div>

          <p className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
            {finale.finalists.filter(Boolean).length} OF 4 FINALISTS CLINCHED
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERTICAL CONNECTOR LINE (For Mobile Flow)
// ---------------------------------------------------------------------------
function VerticalConnector() {
  return (
    <div className="-my-2 flex justify-center" aria-hidden="true">
      <div className="h-6 w-px bg-gradient-to-b from-[#333] to-[#222]" />
    </div>
  );
}
