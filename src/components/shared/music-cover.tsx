'use client';

import { useState } from 'react';
import { Music2 } from 'lucide-react';

export function MusicCover({ src, className = '' }: { src?: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={`flex aspect-square h-10 w-10 shrink-0 items-center justify-center overflow-hidden bg-[#222] ${className}`}
    >
      {src && !failed ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <Music2 className="h-4 w-4 text-[#FF5C00]" />
      )}
    </span>
  );
}
