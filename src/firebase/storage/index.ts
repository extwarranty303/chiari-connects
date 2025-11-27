'use client';

import { FirebaseStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Uploads a file to a specified path in Firebase Storage.
 *
 * @param {FirebaseStorage} storage - The Firebase Storage instance.
 * @param {string} path - The path in the storage bucket where the file will be uploaded (e.g., 'profile-pictures/user-id.jpg').
 * @param {File} file - The file to upload.
 * @returns {Promise<string>} A promise that resolves with the public download URL of the uploaded file.
 * @throws Will throw an error if the upload fails.
 */
export async function uploadFile(storage: FirebaseStorage, path: string, file: File): Promise<string> {
  const storageRef = ref(storage, path);
  
  try {
    // Upload the file to the specified path.
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get the public download URL for the file.
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error("Firebase Storage Error: Failed to upload file.", { path, error });
    // Re-throw a more specific error for the UI to handle.
    throw new Error(`Failed to upload file to ${path}.`);
  }
}
