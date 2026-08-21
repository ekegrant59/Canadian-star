import disposableDomains from 'disposable-email-domains';

const DISPOSABLE_DOMAINS = new Set(
  [
    ...disposableDomains,
    ...(process.env.DISPOSABLE_EMAIL_DOMAINS ?? '')
      .split(',')
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean),
  ].map((domain) => domain.toLowerCase()),
);

export type FraudSignal = {
  code: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  score: number;
};

export type FraudContext = {
  deviceVotesLastHour: number;
  deviceDistinctEmailsLastDay: number;
  ipVotesLastHour: number;
  ipDistinctDevicesLastHour: number;
  artistVotesLastTenMinutes: number;
  ipPrefixVotesLastHour?: number;
  ipPrefixDistinctDevicesLastHour?: number;
  emailDomain?: string;
  sequentialEmailPatternCount?: number;
  hasEstablishedSession?: boolean;
};

/**
 * Shared IPs are normal in homes, offices, campuses, and mobile carrier NAT.
 * An IP-only pattern can add context, but it cannot cross the review threshold.
 */
export function assessVoteFraud(context: FraudContext) {
  const signals: FraudSignal[] = [];

  if (context.deviceDistinctEmailsLastDay >= 5) {
    signals.push({
      code: 'device_many_emails',
      title: 'Many email identities from one browser',
      description: `${context.deviceDistinctEmailsLastDay} distinct email addresses used this browser in 24 hours.`,
      severity: 'high',
      score: 55,
    });
  } else if (context.deviceDistinctEmailsLastDay >= 3) {
    signals.push({
      code: 'device_email_cluster',
      title: 'Multiple email identities from one browser',
      description: `${context.deviceDistinctEmailsLastDay} distinct email addresses used this browser in 24 hours.`,
      severity: 'medium',
      score: 45,
    });
  }

  if (context.deviceVotesLastHour >= 4) {
    signals.push({
      code: 'device_velocity',
      title: 'High browser vote velocity',
      description: `${context.deviceVotesLastHour} vote attempts originated from this browser in one hour.`,
      severity: 'medium',
      score: 35,
    });
  }

  if (context.ipVotesLastHour >= 12 && context.ipDistinctDevicesLastHour <= 2) {
    signals.push({
      code: 'ip_concentrated_velocity',
      title: 'Concentrated network velocity',
      description: `${context.ipVotesLastHour} attempts came from this network through only ${context.ipDistinctDevicesLastHour} browser identifiers in one hour.`,
      severity: 'medium',
      score: 30,
    });
  }

  if (context.artistVotesLastTenMinutes >= 80) {
    signals.push({
      code: 'artist_velocity_spike',
      title: 'Unusual artist vote spike',
      description: `${context.artistVotesLastTenMinutes} attempts targeted this artist in ten minutes. This is contextual and does not identify a voter by itself.`,
      severity: 'low',
      score: 10,
    });
  }

  const emailDomain = context.emailDomain?.toLowerCase();
  if (emailDomain && DISPOSABLE_DOMAINS.has(emailDomain)) {
    signals.push({
      code: 'disposable_email_domain',
      title: 'Disposable email domain',
      description: `${emailDomain} is present in the maintained disposable-domain review list.`,
      severity: 'medium',
      score: 40,
    });
  }

  if ((context.sequentialEmailPatternCount ?? 0) >= 3) {
    signals.push({
      code: 'sequential_email_pattern',
      title: 'Sequential email pattern',
      description: `${context.sequentialEmailPatternCount} similarly numbered addresses were recently used from the same browser or exact network.`,
      severity: 'medium',
      score: 25,
    });
  }

  if (
    (context.ipPrefixVotesLastHour ?? 0) >= 25 &&
    (context.ipPrefixDistinctDevicesLastHour ?? 99) <= 3
  ) {
    signals.push({
      code: 'subnet_concentrated_velocity',
      title: 'Concentrated subnet velocity',
      description: `${context.ipPrefixVotesLastHour} attempts came from one network prefix through only ${context.ipPrefixDistinctDevicesLastHour} browser identifiers in one hour.`,
      severity: 'medium',
      score: 25,
    });
  }

  if (!context.hasEstablishedSession && context.deviceVotesLastHour >= 4) {
    signals.push({
      code: 'no_established_session',
      title: 'No established account session',
      description:
        'This higher-velocity browser did not have an established site session. This is weak context and never flags a vote by itself.',
      severity: 'low',
      score: 10,
    });
  }

  const score = Math.min(
    100,
    signals.reduce((sum, signal) => sum + signal.score, 0),
  );
  return { score, signals, flagged: score >= 70 && signals.length >= 2 };
}

export function countSequentialEmailPatterns(currentEmail: string, recentEmails: string[]) {
  const [currentLocal, currentDomain] = currentEmail.toLowerCase().split('@');
  const match = currentLocal?.match(/^(.*?)(\d{2,})$/);
  if (!match || !currentDomain) return 0;
  const base = match[1];
  return (
    recentEmails.filter((email) => {
      const [local, domain] = email.toLowerCase().split('@');
      const candidate = local?.match(/^(.*?)(\d{2,})$/);
      return domain === currentDomain && candidate?.[1] === base;
    }).length + 1
  );
}

export function parseFraudSignals(value: string | null): FraudSignal[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as FraudSignal[]) : [];
  } catch {
    return [];
  }
}
