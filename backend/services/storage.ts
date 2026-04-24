import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

/**
 * Upload an image (Blob or Uint8Array) to Firebase Storage
 * @param path The path in storage (e.g. 'visitors/pass_123.jpg')
 * @param file The file data
 */
export const uploadImage = async (path: string, file: Blob | Uint8Array): Promise<string> => {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

/**
 * Helper to generate paths for different document types
 */
export const STORAGE_PATHS = {
  VISITORS: (id: string) => `visitors/${id}.jpg`,
  BILLS: (id: string) => `bills/${id}.jpg`,
  COMPLAINTS: (id: string) => `complaints/${id}.jpg`,
  PROFILES: (uid: string) => `profiles/${uid}.jpg`,
};
