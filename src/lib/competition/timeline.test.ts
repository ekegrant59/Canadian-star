import { describe, expect, it } from 'vitest';
import { getVotingClosingSoonWindow, isWithinWindow } from './timeline';

describe('voting closing-soon timeline', () => {
  const voting = {
    startsAt: new Date('2026-11-01T00:00:00Z'),
    endsAt: new Date('2026-12-01T00:00:00Z'),
  };

  it('derives a two-day subsection from the voting deadline', () => {
    const window = getVotingClosingSoonWindow(voting);
    expect(window.startsAt.toISOString()).toBe('2026-11-29T00:00:00.000Z');
    expect(window.endsAt.toISOString()).toBe(voting.endsAt.toISOString());
  });

  it('does not start before a short voting phase begins', () => {
    const window = getVotingClosingSoonWindow({
      startsAt: new Date('2026-11-30T00:00:00Z'),
      endsAt: new Date('2026-12-01T00:00:00Z'),
    });
    expect(window.startsAt.toISOString()).toBe('2026-11-30T00:00:00.000Z');
  });

  it('identifies only the active closing-soon interval', () => {
    const window = getVotingClosingSoonWindow(voting);
    expect(isWithinWindow(new Date('2026-11-28T23:59:59Z'), window)).toBe(false);
    expect(isWithinWindow(new Date('2026-11-29T00:00:00Z'), window)).toBe(true);
    expect(isWithinWindow(new Date('2026-12-01T00:00:00Z'), window)).toBe(false);
  });
});
