
'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

type LogoProps = {
    width: number;
    height: number;
    className?: string;
};

/**
 * @fileoverview A reusable component for displaying the application logo.
 * It uses the Next.js Image component for optimized image loading.
 * The logo image file should be placed in the `/public` directory.
 *
 * @param {LogoProps} props - The props for the Logo component.
 * @returns {React.ReactElement} A responsive and optimized logo image.
 */
export function Logo({ width, height, className }: LogoProps) {
  return (
    <div className={cn('relative', className)} style={{ width, height }}>
        <Image
            src="/ChiariConnectsLogo-blk.png"
            alt="Chiari Connects Logo"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority // Make the logo load quickly as it's important for LCP
            style={{ objectFit: 'contain' }}
        />
    </div>
  );
}
