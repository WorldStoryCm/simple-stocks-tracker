const TARGET_SIZE = 256;
const WEBP_QUALITY = 0.85;

export async function resizeImageToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image");
  }

  const bitmap = await loadBitmap(file);
  const { sx, sy, size } = coverCrop(bitmap.width, bitmap.height);

  const canvas = document.createElement("canvas");
  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, TARGET_SIZE, TARGET_SIZE);

  const dataUrl = canvas.toDataURL("image/webp", WEBP_QUALITY);
  if (!dataUrl.startsWith("data:image/webp")) {
    return canvas.toDataURL("image/jpeg", WEBP_QUALITY);
  }
  return dataUrl;
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function coverCrop(width: number, height: number) {
  const size = Math.min(width, height);
  return {
    size,
    sx: Math.floor((width - size) / 2),
    sy: Math.floor((height - size) / 2),
  };
}
