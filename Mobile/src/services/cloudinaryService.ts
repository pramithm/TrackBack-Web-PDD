import { Platform } from 'react-native';

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dm48clqpw/image/upload';
const UPLOAD_PRESET = 'trackback_preset';

export const cloudinaryService = {
  uploadImage: async (fileUri: string): Promise<string> => {
    if (!fileUri) return '';
    if (fileUri.startsWith('http')) return fileUri;

    console.log('Starting Cloudinary upload for mobile file:', fileUri);

    try {
      const uriParts = fileUri.split('/');
      const fileName = uriParts[uriParts.length - 1];
      const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
      const type = `image/${ext === 'png' ? 'png' : 'jpeg'}`;

      const data = new FormData();
      
      if (Platform.OS === 'web') {
        const response = await fetch(fileUri);
        const blob = await response.blob();
        data.append('file', blob, fileName);
      } else {
        data.append('file', {
          uri: fileUri,
          name: fileName,
          type: type,
        } as any);
      }

      data.append('upload_preset', UPLOAD_PRESET);

      const response = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: data,
        headers: {
          'Accept': 'application/json',
        },
      });

      const result = await response.json();

      if (result.secure_url) {
        const optimizedUrl = result.secure_url.replace('/upload/', '/upload/q_auto,f_auto/');
        console.log('Cloudinary Upload Success:', optimizedUrl);
        return optimizedUrl;
      } else {
        console.error('Cloudinary Error Result:', result);
        throw new Error(result.error?.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Cloudinary Upload Exception:', error);
      throw error;
    }
  }
};
