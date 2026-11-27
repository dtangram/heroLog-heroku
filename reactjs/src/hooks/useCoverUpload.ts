import { ChangeEvent, useCallback, useState } from 'react';
import API from '../API';
import { showAlert } from '../components/dialog';
import { MAX_IMAGE_SIZE, VALID_IMAGE_EXTENSIONS } from '../constants/uploads';

/**
 * Uploads a cover image to S3: checks the type and size, gets a signed URL
 * from the API, uploads the file, then passes the image's URL to onUploaded.
 */
export const useCoverUpload = (onUploaded: (url: string) => void) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      if (!VALID_IMAGE_EXTENSIONS.includes(extension)) {
        event.target.value = ''; // so the rejected file isn't left showing in the picker
        showAlert('Please choose a JPG or PNG image.', { title: "That file type won't work" });
        return;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        event.target.value = '';
        showAlert('Please choose an image smaller than 1MB.', { title: 'That image is too large' });
        return;
      }

      setIsUploading(true);
      try {
        const response = await API.post('/s3/sign', { fileName: file.name, fileType: file.type });
        const { signedRequest, url } = response.data;

        const upload = await fetch(signedRequest, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });
        if (!upload.ok) {
          throw new Error(`Upload failed: ${upload.status} ${upload.statusText}`);
        }

        onUploaded(url);
      } catch (error) {
        console.error('❌ Upload error:', error);
        showAlert('Something went wrong while uploading the image. Please try again.', { title: "The image didn't upload" });
      } finally {
        setIsUploading(false);
      }
    },
    [onUploaded]
  );

  return { isUploading, handleFileInputChange };
};