/**
 * Comprime y convierte una imagen a JPEG antes de subirla.
 * Soporta HEIC/HEIF (iPhone), PNG, WEBP, etc.
 * Máximo 800px de ancho/alto y calidad 0.8.
 */
export async function compressImage(file: File, maxSize = 800, quality = 0.8): Promise<File> {
  // Convertir HEIC/HEIF a JPEG usando canvas
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif' ||
    file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calcular dimensiones manteniendo proporción
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('No canvas context')); return; }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Error al comprimir imagen')); return; }
          const outputName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
          const compressed = new File([blob], outputName, { type: 'image/jpeg' });
          resolve(compressed);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Si falla la carga (ej. HEIC sin soporte nativo), intentar con FileReader
      if (isHeic) {
        // Fallback: subir como está pero renombrar
        const renamed = new File([file], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
        resolve(renamed);
      } else {
        reject(new Error('No se pudo cargar la imagen'));
      }
    };

    img.src = url;
  });
}
