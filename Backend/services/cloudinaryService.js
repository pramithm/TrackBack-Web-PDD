const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dm48clqpw/image/upload';
const UPLOAD_PRESET = 'trackback_preset';

export const cloudinaryService = {
  uploadImage: async (file) => {
    if (!file) return '';
    if (typeof file === 'string' && file.startsWith('http')) return file;

    console.log('Starting Cloudinary upload for web file:', file.name || 'image');

    try {
      const data = new FormData();
      data.append('file', file);
      data.append('upload_preset', UPLOAD_PRESET);

      const response = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: data,
        headers: {
          'Accept': 'application/json'
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
