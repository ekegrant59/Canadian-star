'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Calendar,
  CheckCircle2,
  ExternalLink,
  Pencil,
  Save,
  Settings2,
  Ticket,
  X,
} from 'lucide-react';
import { COMPETITION_STAGES, type CompetitionStage } from '@/config/event';
import {
  assignShowArtistsAction,
  setFinalWinnerAction,
  advanceShowArtistAction,
  setCompetitionStageAction,
  updateCompetitionPhaseAction,
  updateShowAction,
} from '@/server/actions/admin';
import { getVotingClosingSoonWindow } from '@/lib/competition/timeline';
import { ProfileImage } from '@/components/shared/profile-image';

type Phase = {
  id: string;
  key: CompetitionStage;
  label: string;
  startsAt: Date;
  endsAt: Date;
  displayOrder: number;
};
type Artist = {
  id: string;
  applicationId: string;
  name: string;
  avatarUrl: string | null;
  applicationStatus: string;
  profileStatus: string;
  advancedToFinal: boolean;
};
type Show = {
  id: string;
  key: string;
  label: string;
  type: 'qualifier' | 'final';
  showDate: string;
  doorsTime: string | null;
  startTime: string | null;
  contingencyDate: string | null;
  status: 'scheduled' | 'postponed' | 'completed' | 'cancelled';
  statusNote: string | null;
  venueName: string | null;
  venueAddress: string | null;
  ticketUrl: string | null;
  assignedArtists: Array<{
    id: string;
    applicationId: string;
    name: string;
    avatarUrl: string | null;
    performanceOrder: number | null;
    advancedAt: Date | null;
    winnerAt: Date | null;
    sourceShowLabel: string | null;
  }>;
};

export function CompetitionEventsHubView({
  phases: initialPhases,
  shows: initialShows,
  artists,
  initialOverride,
  initialArtistId,
}: {
  phases: Phase[];
  shows: Show[];
  artists: Artist[];
  initialOverride: CompetitionStage | 'auto';
  initialArtistId?: string;
}) {
  const [phases, setPhases] = useState(initialPhases);
  const [shows, setShows] = useState(initialShows);
  const [override, setOverride] = useState<CompetitionStage | 'auto'>(initialOverride);
  const [editingShow, setEditingShow] = useState<Show | null>(() => {
    if (!initialArtistId) return null;
    return (
      shows.find(
        (show) =>
          show.type === 'qualifier' &&
          show.assignedArtists.some((artist) => artist.id === initialArtistId),
      ) ??
      shows.find((show) => show.type === 'qualifier') ??
      null
    );
  });
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const savePhase = (phase: Phase, startsAt: string, endsAt: string) => {
    startSaving(async () => {
      setMessage(null);
      const result = await updateCompetitionPhaseAction({
        phaseId: phase.id,
        startsAt: toTorontoIso(startsAt),
        endsAt: toTorontoIso(endsAt),
        confirmed: true,
      });
      if (!result.ok) return setMessage(result.error);
      setPhases((current) =>
        current.map((item) =>
          item.id === phase.id
            ? { ...item, startsAt: new Date(startsAt), endsAt: new Date(endsAt) }
            : item,
        ),
      );
      window.localStorage.setItem('competition-timeline-updated', String(Date.now()));
      setMessage(`${phase.label} dates saved.`);
    });
  };

  const changeOverride = (stage: CompetitionStage | 'auto') => {
    startSaving(async () => {
      const result = await setCompetitionStageAction({
        stage,
        confirmed: true,
        reason:
          stage === 'auto'
            ? 'Returned to scheduled timeline.'
            : 'Manual operational phase override.',
      });
      if (!result.ok) return setMessage(result.error);
      setOverride(stage);
      window.localStorage.setItem('competition-timeline-updated', String(Date.now()));
      setMessage(
        stage === 'auto' ? 'Scheduled timeline restored.' : 'Manual phase override saved.',
      );
    });
  };

  const saveShow = (show: Show, artistIds: string[], winnerArtistId?: string) => {
    startSaving(async () => {
      setMessage(null);
      const details = await updateShowAction({
        showId: show.id,
        showDate: show.showDate,
        doorsTime: show.doorsTime ?? undefined,
        startTime: show.startTime ?? undefined,
        contingencyDate: show.contingencyDate,
        status: show.status,
        statusNote: show.statusNote,
        venueName: show.venueName ?? 'TBD',
        venueAddress: show.venueAddress,
        ticketUrl: show.ticketUrl,
        confirmed: true,
      });
      if (!details.ok) return setMessage(details.error);
      // Schedule metadata can be maintained before a roster is ready. Save an
      // assignment whenever the roster changed, including a single Final 16
      // artist selected from the review page.
      if (show.type === 'qualifier' && (artistIds.length > 0 || show.assignedArtists.length > 0)) {
        const assignments = await assignShowArtistsAction({
          showId: show.id,
          artistIds,
          confirmed: true,
        });
        if (!assignments.ok) return setMessage(assignments.error);
      }
      if (winnerArtistId) {
        if (show.type === 'qualifier') {
          const existingAdvancement = show.assignedArtists.find(
            (artist) => artist.id === winnerArtistId && artist.advancedAt,
          );
          if (!existingAdvancement) {
            const winner = await advanceShowArtistAction({
              showId: show.id,
              artistId: winnerArtistId,
              confirmed: true,
            });
            if (!winner.ok) return setMessage(winner.error);
          }
        } else {
          const winner = await setFinalWinnerAction({
            showId: show.id,
            artistId: winnerArtistId,
            confirmed: true,
          });
          if (!winner.ok) return setMessage(winner.error);
        }
      }
      const winnerRecordedAt = winnerArtistId ? new Date() : null;
      const artistDetails = new Map(artists.map((artist) => [artist.id, artist]));
      const previous = new Map(
        show.assignedArtists.map((artist) => [artist.id, artist.advancedAt]),
      );
      setShows((current) => {
        const updated = current.map((item) =>
          item.id === show.id
            ? {
                ...show,
                status: winnerArtistId ? 'completed' : show.status,
                assignedArtists: artistIds.map((id, index) => {
                  const artist = artistDetails.get(id);
                  return {
                    id,
                    applicationId: artist?.applicationId ?? '',
                    name: artist?.name ?? id,
                    avatarUrl: artist?.avatarUrl ?? null,
                    performanceOrder: index + 1,
                    advancedAt:
                      previous.get(id) ??
                      (show.type === 'qualifier' && winnerArtistId === id
                        ? winnerRecordedAt
                        : null),
                    winnerAt:
                      show.type === 'final' && winnerArtistId
                        ? winnerArtistId === id
                          ? winnerRecordedAt
                          : null
                        : (show.assignedArtists.find((item) => item.id === id)?.winnerAt ?? null),
                    sourceShowLabel:
                      show.assignedArtists.find((item) => item.id === id)?.sourceShowLabel ?? null,
                  };
                }),
              }
            : item,
        );
        if (show.type !== 'qualifier') return updated;
        const currentFinal = updated.find((item) => item.type === 'final');
        if (!currentFinal) return updated;
        const finalIndex = updated.indexOf(currentFinal);
        const finalShow: Show = {
          ...currentFinal,
          assignedArtists: [...currentFinal.assignedArtists],
        };
        const advanced = updated
          .filter((item) => item.type === 'qualifier')
          .flatMap((item) =>
            item.assignedArtists
              .filter((artist) => artist.advancedAt)
              .map((artist) => ({ artist, sourceShowLabel: item.label })),
          )
          .filter(
            (entry, index, all) =>
              all.findIndex((candidate) => candidate.artist.id === entry.artist.id) === index,
          )
          .sort((a, b) => a.sourceShowLabel.localeCompare(b.sourceShowLabel));
        finalShow.assignedArtists = advanced.map(({ artist, sourceShowLabel }, index) => ({
          ...artist,
          performanceOrder: index + 1,
          sourceShowLabel,
          winnerAt:
            finalShow.assignedArtists.find((item) => item.id === artist.id)?.winnerAt ?? null,
        }));
        updated[finalIndex] = finalShow;
        return updated;
      });
      setEditingShow(null);
      setMessage(`${show.label} saved.`);
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
            Competition & Events
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            The single control surface for campaign dates, phase changes, shows, tickets, and artist
            assignments.
          </p>
        </div>
        {message && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            {message}
          </div>
        )}
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col justify-between gap-4 border-b border-gray-100 pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
              <Settings2 className="h-4 w-4 text-[#FF5C00]" />
              Phase timeline
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Dates are scheduled in the database; manual override is reserved for operational
              exceptions.
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
            Live mode
            <select
              value={override}
              onChange={(event) => changeOverride(event.target.value as CompetitionStage | 'auto')}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900"
            >
              <option value="auto">Follow scheduled dates</option>
              {COMPETITION_STAGES.map((stage) => (
                <option key={stage.key} value={stage.key}>
                  {stage.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {phases.map((phase) => (
            <PhaseEditor key={phase.id} phase={phase} isSaving={isSaving} onSave={savePhase} />
          ))}
          {phases.find((phase) => phase.key === 'voting') && (
            <VotingClosingSoonSubphase phase={phases.find((phase) => phase.key === 'voting')!} />
          )}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
        <div
          id="five-live-shows"
          className="flex items-center justify-between border-b border-gray-100 pb-4"
        >
          <div>
            <h2 className="text-base font-bold text-gray-900">Five live shows</h2>
            <p className="mt-1 text-xs text-gray-500">
              Edit dates, ticket links, status, and assignments from the event details modal.
            </p>
          </div>
          <Ticket className="h-5 w-5 text-[#FF5C00]" />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {shows.map((show) => (
            <article key={show.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{show.label}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-600">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(show.showDate)} · {show.startTime ?? 'Time TBD'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{show.venueName ?? 'Venue TBD'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMessage(null);
                    setEditingShow(show);
                  }}
                  className="rounded-lg p-2 text-gray-500 hover:bg-white hover:text-gray-900"
                  aria-label={`Edit ${show.label}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 space-y-2 border-t border-gray-200 pt-3 text-xs">
                {show.assignedArtists.map((artist) => (
                  <div
                    key={artist.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2"
                  >
                    <ProfileImage
                      src={artist.avatarUrl}
                      alt={artist.name}
                      className="h-12 w-12 shrink-0 rounded-lg"
                    />
                    <Link
                      href={`/admin/applications/${artist.applicationId}`}
                      className="group min-w-0 flex-1"
                    >
                      <span className="block truncate font-bold text-gray-900 group-hover:text-[#FF5C00]">
                        {artist.name}
                      </span>
                      <span className="mt-0.5 block text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                        {artist.winnerAt
                          ? 'Grand Final winner'
                          : artist.advancedAt
                            ? 'Advanced to Grand Final'
                            : show.type === 'final' && artist.sourceShowLabel
                              ? `Winner of ${artist.sourceShowLabel}`
                              : 'View application review'}
                      </span>
                    </Link>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1">
                  <span className="font-semibold text-gray-600 capitalize">{show.status}</span>
                  <span className="text-gray-500">{show.assignedArtists.length} assigned</span>
                  {show.ticketUrl && (
                    <a
                      href={show.ticketUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#FF5C00]"
                      aria-label={`Open ${show.label} ticket link`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {editingShow && (
        <EventEditorModal
          show={editingShow}
          artists={artists}
          initialArtistId={initialArtistId}
          isSaving={isSaving}
          onClose={() => setEditingShow(null)}
          message={message}
          onSave={saveShow}
        />
      )}
    </div>
  );
}

function VotingClosingSoonSubphase({ phase }: { phase: Phase }) {
  const window = getVotingClosingSoonWindow(phase);
  return (
    <div className="rounded-xl border border-dashed border-[#FF5C00]/50 bg-orange-50/50 p-4 md:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Voting closes soon</h3>
          <p className="mt-1 text-xs text-gray-600">
            Automatic two-day countdown subsection of Fan Voting. It follows the voting deadline and
            cannot be edited separately.
          </p>
        </div>
        <span className="text-[10px] font-bold tracking-wider text-[#FF5C00] uppercase">Auto</span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <TimelineDate label="Starts" value={window.startsAt} />
        <TimelineDate label="Ends" value={window.endsAt} />
      </div>
    </div>
  );
}

function TimelineDate({ label, value }: { label: string; value: Date }) {
  return (
    <div className="rounded-lg border border-orange-200 bg-white px-3 py-2">
      <p className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">{label}</p>
      <p className="mt-1 text-xs font-semibold text-gray-900">
        {new Intl.DateTimeFormat('en-CA', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'America/Toronto',
        }).format(new Date(value))}
      </p>
    </div>
  );
}

function PhaseEditor({
  phase,
  isSaving,
  onSave,
}: {
  phase: Phase;
  isSaving: boolean;
  onSave: (phase: Phase, startsAt: string, endsAt: string) => void;
}) {
  const toInput = (value: Date) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(value));
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
  };
  const [startsAt, setStartsAt] = useState(toInput(phase.startsAt));
  const [endsAt, setEndsAt] = useState(toInput(phase.endsAt));
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">{phase.label}</h3>
        <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
          Phase {phase.displayOrder}
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
          Starts
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-2 text-xs text-gray-900"
          />
        </label>
        <label className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
          Ends
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-2 text-xs text-gray-900"
          />
        </label>
      </div>
      <button
        type="button"
        disabled={isSaving}
        onClick={() => onSave(phase, startsAt, endsAt)}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
      >
        <Save className="h-3.5 w-3.5" />
        Save dates
      </button>
    </div>
  );
}

function EventEditorModal({
  show,
  artists,
  initialArtistId,
  isSaving,
  message,
  onClose,
  onSave,
}: {
  show: Show;
  artists: Artist[];
  initialArtistId?: string;
  isSaving: boolean;
  message: string | null;
  onClose: () => void;
  onSave: (show: Show, artistIds: string[], winnerArtistId?: string) => void;
}) {
  const [draft, setDraft] = useState(show);
  const [artistIds, setArtistIds] = useState(() => {
    const ids = show.assignedArtists.map((artist) => artist.id);
    const requestedArtistIsEligible = artists.some(
      (artist) =>
        artist.id === initialArtistId &&
        (show.type === 'final'
          ? artist.advancedToFinal
          : artist.applicationStatus === 'shortlisted' || artist.applicationStatus === 'finalist'),
    );
    if (
      show.type !== 'final' &&
      initialArtistId &&
      requestedArtistIsEligible &&
      !ids.includes(initialArtistId)
    )
      ids.push(initialArtistId);
    return ids;
  });
  const [winnerArtistId, setWinnerArtistId] = useState<string | undefined>(
    () => show.assignedArtists.find((artist) => artist.advancedAt || artist.winnerAt)?.id,
  );
  const finalRosterReady = show.type !== 'final' || artistIds.length === 4;
  const selectableArtists = artists.filter(
    (artist) =>
      artist.applicationStatus === 'shortlisted' || artist.applicationStatus === 'finalist',
  );
  const toggleArtist = (id: string) => {
    setArtistIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
    setWinnerArtistId((winner) => (winner === id ? undefined : winner));
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Edit {show.label}</h2>
            <p className="mt-1 text-xs text-gray-500">
              This updates the public schedule and assignment records.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field
            label="Date"
            type="date"
            value={draft.showDate}
            onChange={(value) => setDraft({ ...draft, showDate: value })}
          />
          <Field
            label="Start time"
            type="time"
            value={draft.startTime ?? ''}
            onChange={(value) => setDraft({ ...draft, startTime: value })}
          />
          <Field
            label="Doors time"
            type="time"
            value={draft.doorsTime ?? ''}
            onChange={(value) => setDraft({ ...draft, doorsTime: value })}
          />
          <Field
            label="Contingency date"
            type="date"
            value={draft.contingencyDate ?? ''}
            onChange={(value) => setDraft({ ...draft, contingencyDate: value || null })}
          />
          <Field
            label="Venue"
            value={draft.venueName ?? ''}
            onChange={(value) => setDraft({ ...draft, venueName: value })}
          />
          <Field
            label="Ticket URL"
            type="url"
            value={draft.ticketUrl ?? ''}
            onChange={(value) => setDraft({ ...draft, ticketUrl: value || null })}
          />
        </div>
        <label className="mt-4 block text-xs font-bold text-gray-600">
          Venue address
          <input
            value={draft.venueAddress ?? ''}
            onChange={(event) => setDraft({ ...draft, venueAddress: event.target.value })}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="mt-4 block text-xs font-bold text-gray-600">
          Status
          <select
            value={draft.status}
            onChange={(event) =>
              setDraft({ ...draft, status: event.target.value as Show['status'] })
            }
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="scheduled">Scheduled</option>
            <option value="postponed">Postponed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label className="mt-4 block text-xs font-bold text-gray-600">
          Status note
          <textarea
            value={draft.statusNote ?? ''}
            onChange={(event) => setDraft({ ...draft, statusNote: event.target.value || null })}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            rows={2}
          />
        </label>
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold tracking-wider text-gray-600 uppercase">
                {show.type === 'final' ? 'Grand Finalists' : 'Assign Final 16 artists'}
              </h3>
              <p className="mt-1 text-[11px] text-gray-500">
                {show.type === 'final'
                  ? 'Qualifier winners are added automatically as each live show is completed.'
                  : 'Only shortlisted or finalist artists appear here.'}
              </p>
            </div>
            <span className="text-xs text-gray-500">{artistIds.length} selected</span>
          </div>
          {show.type === 'final' ? (
            <div className="mt-2 space-y-2">
              {show.assignedArtists.length ? (
                show.assignedArtists.map((artist) => (
                  <div
                    key={artist.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs"
                  >
                    <span className="font-bold text-gray-900">{artist.name}</span>
                    <span className="text-gray-500">
                      {artist.sourceShowLabel
                        ? `Winner of ${artist.sourceShowLabel}`
                        : 'Qualifier winner'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-xs text-gray-500">
                  No qualifying show winners have been recorded yet.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-2 grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
              {selectableArtists.length ? (
                selectableArtists.map((artist) => (
                  <button
                    type="button"
                    key={artist.id}
                    onClick={() => toggleArtist(artist.id)}
                    className={`rounded-lg border px-3 py-2 text-left text-xs ${artistIds.includes(artist.id) ? 'border-[#FF5C00] bg-orange-50' : 'border-gray-200 bg-gray-50'}`}
                  >
                    <span className="font-bold text-gray-900">{artist.name}</span>
                    <span className="ml-1 text-gray-500">{artist.applicationStatus}</span>
                  </button>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-xs text-gray-500 sm:col-span-2">
                  No eligible artists are available yet.
                </p>
              )}
            </div>
          )}
        </div>
        {artistIds.length > 0 && (
          <label className="mt-4 block text-xs font-bold text-gray-600">
            {show.type === 'final' ? 'Grand Final winner' : 'Qualifying show winner'}
            <select
              value={winnerArtistId ?? ''}
              disabled={!finalRosterReady}
              onChange={(event) => setWinnerArtistId(event.target.value || undefined)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="">Choose after the show</option>
              {artistIds.map((id) => {
                const artist = artists.find((item) => item.id === id);
                return (
                  <option key={id} value={id}>
                    {artist?.name ?? id}
                  </option>
                );
              })}
            </select>
            <span className="mt-1 block text-[11px] font-normal text-gray-500">
              {show.type === 'final'
                ? finalRosterReady
                  ? 'Selecting this records the official competition champion.'
                  : 'Awaiting all four qualifying show winners.'
                : 'Selecting this advances the artist to the Grand Final.'}
            </span>
          </label>
        )}
        <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
          {message && (
            <p className="mr-auto self-center text-xs font-semibold text-red-600" role="status">
              {message}
            </p>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => onSave(draft, artistIds, winnerArtistId)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FF5C00] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save event'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="text-xs font-bold text-gray-600">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
      />
    </label>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(
    new Date(`${value}T12:00:00`),
  );
}

function toTorontoIso(value: string) {
  const [date, time] = value.split('T');
  const probe = new Date(`${date}T12:00:00Z`);
  const offsetName =
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Toronto', timeZoneName: 'longOffset' })
      .formatToParts(probe)
      .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT-05:00';
  const offset = offsetName.replace('GMT', '') || '+00:00';
  return new Date(`${date}T${time}:00${offset}`).toISOString();
}
