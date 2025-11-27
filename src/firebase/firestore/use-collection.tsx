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
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 * 
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *  
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    // If the query is not ready (e.g., waiting for user ID), do not attempt to fetch.
    // Set loading to false because we are not actively fetching.
    if (!memoizedTargetRefOrQuery) {
      setIsLoading(false);
      setData(null);
      setError(null);
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
        // A collection group query is a special case, it does not have a path property.
        // It has a _query object with a collectionId property.
        const isCollectionGroupQuery = (memoizedTargetRefOrQuery as any)._query?.collectionId;
        const path = isCollectionGroupQuery
          ? `Collection Group: ${(memoizedTargetRefOrQuery as any)._query.collectionId}`
          : (memoizedTargetRefOrQuery as any).path;

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        });

        setError(contextualError)
        setData(null)
        setIsLoading(false)

        // trigger global error propagation
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery]); // Re-run if the target query/reference changes.
  
  if(memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    // This check is a safeguard that is not foolproof, especially for collectionGroup queries
    // which lack a .path property. We will log a warning instead of throwing an error for those.
    const isStandardQuery = !!(memoizedTargetRefOrQuery as any).path;
    if (isStandardQuery) {
      throw new Error((memoizedTargetRefOrQuery as any).path + ' was not properly memoized using useMemoFirebase');
    } else {
      // It might be a collection group or other complex query. Warn the developer.
      console.warn('A query was passed to useCollection without being wrapped in useMemoFirebase. This can lead to infinite render loops. Query:', memoizedTargetRefOrQuery);
    }
  }

  return { data, isLoading, error };
}
