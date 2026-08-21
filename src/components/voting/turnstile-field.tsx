'use client';

import Script from 'next/script';
import { useCallback, useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}

type TurnstileFieldProps = {
  onToken: (token: string) => void;
  onAvailabilityChange?: (available: boolean) => void;
};

export function TurnstileField({ onToken, onAvailabilityChange }: TurnstileFieldProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const elementRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const onAvailabilityChangeRef = useRef(onAvailabilityChange);
  const [loadFailed, setLoadFailed] = useState(false);
  const isDevelopment = process.env.NODE_ENV !== 'production';

  useEffect(() => {
    onTokenRef.current = onToken;
    onAvailabilityChangeRef.current = onAvailabilityChange;
  }, [onAvailabilityChange, onToken]);

  const render = useCallback(() => {
    if (!siteKey || !elementRef.current || !window.turnstile || widgetRef.current) return;
    widgetRef.current = window.turnstile.render(elementRef.current, {
      sitekey: siteKey,
      action: 'vote',
      appearance: 'always',
      callback: (token: string) => {
        setLoadFailed(false);
        onTokenRef.current(token);
        onAvailabilityChangeRef.current?.(true);
      },
      'expired-callback': () => {
        onTokenRef.current('');
        onAvailabilityChangeRef.current?.(false);
      },
      'error-callback': () => {
        setLoadFailed(true);
        onTokenRef.current('');
        onAvailabilityChangeRef.current?.(false);
      },
    });
  }, [siteKey]);

  useEffect(() => {
    if (isDevelopment || !siteKey) onAvailabilityChangeRef.current?.(true);
    return () => {
      if (widgetRef.current && window.turnstile) window.turnstile.remove(widgetRef.current);
      widgetRef.current = null;
    };
  }, [isDevelopment, siteKey]);

  if (isDevelopment || !siteKey) return null;
  return (
    <div className="flex min-h-[70px] flex-col items-center justify-center gap-2">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={render}
        onReady={render}
        onError={() => {
          setLoadFailed(true);
          onAvailabilityChangeRef.current?.(false);
        }}
      />
      <div
        ref={elementRef}
        className="flex min-h-[65px] w-full items-center justify-center overflow-hidden"
      />
      {loadFailed && (
        <p className="text-center text-xs text-red-300" role="alert">
          The security check could not load. Check your connection and try again.
        </p>
      )}
    </div>
  );
}
