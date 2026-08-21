'use client';

import Image from 'next/image';
import { UserRound } from 'lucide-react';
import { useState } from 'react';

type ProfileImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  iconClassName?: string;
  unoptimized?: boolean;
};

/** Renders a real uploaded photo, or a consistent neutral profile placeholder. */
export function ProfileImage({
  src,
  alt,
  className = '',
  iconClassName = 'h-5 w-5',
  unoptimized = false,
}: ProfileImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(src) && failedSrc !== src;

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gray-100 text-gray-400 ${className}`}
      role="img"
      aria-label={showImage ? alt : `${alt} profile image not provided`}
    >
      {showImage ? (
        <Image
          src={src!}
          alt={alt}
          fill
          unoptimized={unoptimized}
          className="object-cover"
          onError={() => setFailedSrc(src ?? null)}
        />
      ) : (
        <UserRound className={iconClassName} aria-hidden="true" />
      )}
    </div>
  );
}
