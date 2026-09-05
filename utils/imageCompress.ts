// Downscale + re-encode a photo before it goes over the wire: a phone photo
// can be 10+ MB, and Vercel's serverless functions cap request bodies at
// ~4.5MB — well below what a raw upload plus base64's 1.33x overhead would need.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.72;

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_SOURCE_FILE_BYTES = 15 * 1024 * 1024; // reject absurd files before even decoding them

export function isAcceptedImageType(type: string): boolean {
  return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type);
}

// Always re-encodes as JPEG (predictable size, no need to branch on source format).
export async function compressImageFile(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Gagal membaca gambar'));
      el.src = objectUrl;
    });

    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas tidak didukung browser ini');
    ctx.drawImage(img, 0, 0, width, height);

    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
