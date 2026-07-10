import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * Compresses an image file client-side using a canvas element.
 */
export async function compressImage(file: File, maxWidth = 800, maxHeight = 800, quality = 0.75): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // If it's not a standard browser image type, return the file as-is
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // fallback to original
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

/**
 * Uploads a file (or compressed image) to Firebase Storage with progress tracking.
 */
export async function uploadFile(
  path: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  let uploadData: Blob | File = file;
  if (file.type.startsWith('image/')) {
    try {
      uploadData = await compressImage(file);
    } catch (e) {
      console.warn('Image compression failed, proceeding with original file.', e);
    }
  }

  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, uploadData);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(Math.round(progress));
        }
      },
      (error) => {
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

/**
 * Deletes a file from Firebase Storage given its absolute download URL.
 */
export async function deleteFile(url: string): Promise<void> {
  if (!url) return;
  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  } catch (error) {
    console.warn('Failed to delete file from Firebase Storage. It might have already been deleted.', error);
  }
}
