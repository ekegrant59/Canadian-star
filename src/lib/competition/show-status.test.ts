import { describe, expect, it } from 'vitest';
import { isScheduledShowLive } from './show-status';

const show = {
  status: 'scheduled' as const,
  showDate: '2026-09-03',
  startTime: '19:00',
};

describe('isScheduledShowLive', () => {
  it('is live after the scheduled start in Toronto', () => {
    expect(isScheduledShowLive(show, new Date('2026-09-03T23:30:00.000Z'))).toBe(true);
  });

  it('is upcoming before the scheduled start', () => {
    expect(isScheduledShowLive(show, new Date('2026-09-03T22:00:00.000Z'))).toBe(false);
  });

  it('does not mark a different date or completed show live', () => {
    expect(isScheduledShowLive(show, new Date('2026-09-04T04:30:00.000Z'))).toBe(false);
    expect(
      isScheduledShowLive({ ...show, status: 'completed' }, new Date('2026-09-03T23:30:00.000Z')),
    ).toBe(false);
  });

  it('treats a show without a start time as live on its date', () => {
    expect(
      isScheduledShowLive({ ...show, startTime: null }, new Date('2026-09-03T15:00:00.000Z')),
    ).toBe(true);
  });
});
