/**
 * Compresses an image File or Base64/DataURL string to an optimized JPEG DataURL
 * (max dimension 1600px, quality 0.85).
 * Reduces multi-megabyte photo uploads to ~300-600KB while keeping crisp visual detail
 * for Gemini vision models, preventing HTTP 413 or payload errors.
 */
export async function compressImageToDataUrl(
  input: File | string,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.85
): Promise<{ dataUrl: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (typeof input === 'string' && (input.startsWith('http://') || input.startsWith('https://'))) {
      img.crossOrigin = 'Anonymous';
    }

    const handleLoad = () => {
      let width = img.width || 1200;
      let height = img.height || 900;

      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo inicializar el contexto 2D del navegador.'));
        return;
      }

      // Draw white background in case of transparent PNG/WEBP
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve({
        dataUrl: compressedDataUrl,
        mimeType: 'image/jpeg',
      });
    };

    img.onerror = () => {
      reject(new Error('Error al cargar la imagen para optimización.'));
    };

    if (typeof input === 'string') {
      img.src = input;
      if (img.complete && img.naturalWidth > 0) {
        handleLoad();
      } else {
        img.onload = handleLoad;
      }
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        img.src = result;
        img.onload = handleLoad;
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));
      reader.readAsDataURL(input);
    }
  });
}
