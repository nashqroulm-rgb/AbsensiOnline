import type { ServiceResult } from '../types';

interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  format: string;
  bytes: number;
  resource_type: string;
}

export async function uploadToCloudinary(
  file: File,
  folder: string,
  onProgress?: (percent: number) => void,
): Promise<ServiceResult<CloudinaryResponse>> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    return { success: false, error: 'Cloudinary tidak dikonfigurasi. Periksa VITE_CLOUDINARY_CLOUD_NAME dan VITE_CLOUDINARY_UPLOAD_PRESET di .env.' };
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', `absensi/${folder}`);

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/upload`);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      try {
        const response = JSON.parse(xhr.responseText) as CloudinaryResponse;
        if (xhr.status >= 200 && xhr.status < 300 && response.secure_url) {
          resolve({ success: true, data: response });
        } else {
          const errMsg = (response as unknown as { error?: { message?: string } })?.error?.message || 'Upload gagal';
          resolve({ success: false, error: errMsg });
        }
      } catch {
        resolve({ success: false, error: 'Gagal memproses respons upload.' });
      }
    });

    xhr.addEventListener('error', () => {
      resolve({ success: false, error: 'Gagal terhubung ke Cloudinary. Periksa koneksi internet.' });
    });

    xhr.addEventListener('abort', () => {
      resolve({ success: false, error: 'Upload dibatalkan.' });
    });

    xhr.send(formData);
  });
}
