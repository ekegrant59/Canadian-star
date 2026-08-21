const CLOSING_SOON_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * The closing-soon period is a derived subsection of fan voting. It is never
 * edited independently: moving the voting deadline moves this window with it.
 */
export function getVotingClosingSoonWindow(voting: { startsAt: Date; endsAt: Date }) {
  const derivedStart = new Date(voting.endsAt.getTime() - CLOSING_SOON_WINDOW_MS);
  return {
    startsAt: derivedStart < voting.startsAt ? new Date(voting.startsAt) : derivedStart,
    endsAt: new Date(voting.endsAt),
  };
}

export function isWithinWindow(now: Date, window: { startsAt: Date; endsAt: Date }) {
  return now >= window.startsAt && now < window.endsAt;
}
