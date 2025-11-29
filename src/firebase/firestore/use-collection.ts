'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemoFirebase to memoize it per React guidance. Also make sure that its dependencies are stable references
 * 
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
  memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean}) | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  // ✅ FIXED: Moved validation BEFORE all hooks
  // This must happen before any useState or useEffect calls
  if (memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    const isStandardQuery = !!(memoizedTargetRefOrQuery as any).path;
    if (isStandardQuery) {
      throw new Error(`The query for path "${(memoizedTargetRefOrQuery as any).path}" was not wrapped in useMemoFirebase. This is required to prevent infinite re-renders.`);
    } else {
      console.warn('A query was passed to useCollection without being wrapped in useMemoFirebase. This can lead to infinite render loops. Query:', memoizedTargetRefOrQuery);
    }
  }

  // Now hooks come after validation
  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    // If the query is not ready, do not fetch. Set loading to false as we are not fetching.
    if (!memoizedTargetRefOrQuery) {
      setIsLoading(false);
      setData(null);
      setError(null);
      return;
    }

    const path = (memoizedTargetRefOrQuery as any).path;
    if (path && path.includes('undefined')) {
      // Don't treat this as a fatal error, just stop and wait for a valid path.
      setIsLoading(false);
      setData(null);
      setError(new Error(`Invalid query: path contains undefined segment (${path})`));
      return;
    }

    setIsLoading(true);
    setError(null);
    
    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id });
        }
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        const isCollectionGroupQuery = (memoizedTargetRefOrQuery as any)._query?.collectionId;
        const path = isCollectionGroupQuery
          ? `Collection Group: ${(memoizedTargetRefOrQuery as any)._query.collectionId}`
          : (memoizedTargetRefOrQuery as any).path;

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        });

        setError(contextualError);
        setData(null);
        setIsLoading(false);

        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery]);

  return { data, isLoading, error };
}