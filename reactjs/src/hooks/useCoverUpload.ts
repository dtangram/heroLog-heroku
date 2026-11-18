import { ChangeEvent, useCallback, useState } from 'react';
import API from '../API';

export const VALID_IMAGE_EXTENSIONS = ['jpg', 'png', 'jpeg'];
export const MAX_COVER_SIZE = 1e6; // 1MB
export const useCoverUpload = (onUploaded: (url: string) => void) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      if (!VALID_IMAGE_EXTENSIONS.includes(extension)) {
        alert(`Image must have one of these extensions: ${VALID_IMAGE_EXTENSIONS.join(', ')}`);
        return;
      }
      if (file.size > MAX_COVER_SIZE) {
        alert('Image size must be smaller than 1MB');
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
        alert('Failed to upload image. Please try again.');
      } finally {
        setIsUploading(false);
      }
    },
    [onUploaded]
  );

  return { isUploading, handleFileInputChange };
};