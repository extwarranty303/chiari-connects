'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  writeBatch,
  CollectionReference,
  DocumentReference,
  SetOptions,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import {FirestorePermissionError} from '@/firebase/errors';

/**
 * Initiates a setDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function setDocumentNonBlocking(docRef: DocumentReference, data: any, options: SetOptions) {
  setDoc(docRef, data, options).catch(async (error) => {
    const contextualError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'write', // or 'create'/'update' based on options
      requestResourceData: data,
    });
    errorEmitter.emit('permission-error', contextualError);
  })
  // Execution continues immediately
}


/**
 * Initiates an addDoc operation for a collection reference.
 * Does NOT await the write operation internally.
 * Returns the Promise for the new doc ref, but typically not awaited by caller.
 */
export function addDocumentNonBlocking(colRef: CollectionReference, data: any) {
  const promise = addDoc(colRef, data)
    .catch(async (error) => {
      const contextualError = new FirestorePermissionError({
        path: colRef.path,
        operation: 'create',
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', contextualError);
    });
  return promise;
}


/**
 * Initiates an updateDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function updateDocumentNonBlocking(docRef: DocumentReference, data: any) {
  updateDoc(docRef, data)
    .catch(async (error) => {
      const contextualError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', contextualError);
    });
}


/**
 * Initiates a deleteDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function deleteDocumentNonBlocking(docRef: DocumentReference) {
  deleteDoc(docRef)
    .catch(async (error) => {
      const contextualError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', contextualError);
    });
}

/**
 * Initiates a non-blocking deletion of all documents in a collection.
 * It fetches all documents and then deletes them in a batch.
 */
export function deleteCollectionNonBlocking(collectionRef: CollectionReference) {
    const promise = getDocs(collectionRef)
        .then(snapshot => {
            if (snapshot.empty) {
                return;
            }
            const batch = writeBatch(collectionRef.firestore);
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            // Return the promise from batch.commit()
            return batch.commit();
        })
        .catch(async (error) => {
            // Differentiate between read error (getDocs) and write error (commit)
            const isReadError = !('docs' in error); // Simple check, might need refinement
            const contextualError = new FirestorePermissionError({
                path: collectionRef.path,
                // If we fail at getDocs, it's a 'list' op. If we fail at commit, it's a 'delete' op.
                operation: isReadError ? 'list' : 'delete',
            });
            errorEmitter.emit('permission-error', contextualError);
            // We need to re-throw or return a rejected promise so the caller's .catch can trigger
            throw error;
        });
    return promise;
}
