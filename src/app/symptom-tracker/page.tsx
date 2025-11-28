'use client';
import dynamic from 'next/dynamic';

const SymptomTracker = dynamic(() => import('@/components/SymptomTracker'), { ssr: false });

export default function SymptomTrackerPage() {
  return <SymptomTracker />;
}
