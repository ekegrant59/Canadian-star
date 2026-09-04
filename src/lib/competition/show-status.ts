type ShowTiming = {
  status: 'scheduled' | 'postponed' | 'completed' | 'cancelled';
  showDate: string;
  startTime: string | null;
};

function torontoDateParts(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    date: `${value('year')}-${String(value('month')).padStart(2, '0')}-${String(value('day')).padStart(2, '0')}`,
    minutes: value('hour') * 60 + value('minute'),
  };
}

function parseTime(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59) return null;
  const meridiem = match[3]?.toUpperCase();
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === 'AM' && hour === 12) hour = 0;
    if (meridiem === 'PM' && hour !== 12) hour += 12;
  } else if (hour > 23) {
    return null;
  }
  return hour * 60 + minute;
}

/** A scheduled show is live from its start time through the end of its date. */
export function isScheduledShowLive(show: ShowTiming, now = new Date()) {
  if (show.status !== 'scheduled') return false;
  const current = torontoDateParts(now);
  if (current.date !== show.showDate) return false;
  if (!show.startTime) return true;
  const start = parseTime(show.startTime);
  return start !== null && current.minutes >= start;
}
