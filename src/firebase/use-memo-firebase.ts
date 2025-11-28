'use client';

import { useMemo, DependencyList } from 'react';

/**
 * A wrapper around React's useMemo specifically for Firebase queries.
 * This marks the memoized query with a __memo flag to help detect
 * queries that weren't properly memoized.
 * 
 * CRITICAL: Always use this instead of useMemo for Firebase queries
 * to prevent infinite render loops.
 * 
 * @example
 * const symptomsQuery = useMemoFirebase(() => {
 *   if (!user || !firestore) return null;
 *   return query(
 *     collection(firestore, 'users', user.uid, 'symptoms'),
 *     orderBy('date', 'desc')
 *   );
 * }, [firestore, user]);
 */
export function useMemoFirebase<T>(
  factory: () => T,
  deps: DependencyList
): T {
  const memoized = useMemo(factory, deps);
  
  // Mark the query with __memo flag if it's not null/undefined
  if (memoized && typeof memoized === 'object') {
    Object.defineProperty(memoized, '__memo', {
      value: true,
      writable: false,
      configurable: true, // Make it configurable so it can be re-defined if needed
      enumerable: false,
    });
  }
  
  return memoized;
}
