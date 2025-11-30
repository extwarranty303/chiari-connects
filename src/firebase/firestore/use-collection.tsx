
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
 * A React hook to fetch a Firestore collection in real-time.
 *
 * @template T The type of the document data.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null} memoizedQuery - A memoized Firestore query or collection reference.
 *   MUST be wrapped in `useMemoFirebase` to prevent re-renders.
 * @returns {UseCollectionResult<T>} An object containing the collection data, loading state, and error.
 */
export function useCollection<T = any>(
  memoizedQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;
  
  if (memoizedQuery && !memoizedQuery.__memo) {
      const isStandardQuery = !!(memoizedQuery as any).path;
      if (isStandardQuery) {
        throw new Error(`The query for path "${(memoizedQuery as any).path}" was not wrapped in useMemoFirebase. This is required to prevent infinite re-renders.`);
      } else {
        // It might be a collection group or other complex query. Warn the developer.
        console.warn('A query was passed to useCollection without being wrapped in useMemoFirebase. This can lead to infinite render loops. Query:', memoizedQuery);
      }
  }

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    // If the query isn't ready, set loading to false and clear data/errors.
    if (!memoizedQuery) {
      setIsLoading(false);
      setData(null);
      setError(null);
      return;
    }
    
    // Critical check: Ensure the path doesn't contain 'undefined'.
    const path = (memoizedQuery as any).path;
    if (path && path.includes('undefined')) {
        const pathError = new Error(`Invalid query: path contains undefined segment (${path})`);
        setError(pathError);
        setIsLoading(false);
        setData(null);
        return;
    }

    // Start loading as we are about to attach the listener.
    setIsLoading(true);

    const unsubscribe = onSnapshot(
      memoizedQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = snapshot.docs.map(doc => ({ ...(doc.data() as T), id: doc.id }));
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        const isCollectionGroupQuery = (memoizedQuery as any)._query?.collectionId;
        const pathForError = isCollectionGroupQuery
          ? `Collection Group: ${(memoizedQuery as any)._query.collectionId}`
          : (memoizedQuery as any).path;
        
        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path: pathForError,
        });

        setError(contextualError);
        setData(null);
        setIsLoading(false);
        
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [memoizedQuery]);

  return { data, isLoading, error };
}
