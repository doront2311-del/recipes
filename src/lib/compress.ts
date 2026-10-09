import imageCompression from "browser-image-compression";

/** Shrinks a photo/screenshot so uploads stay small but text stays readable for Claude. */
export function compressImage(file: File) {
  return imageCompression(file, {
    maxSizeMB: 0.4,
    maxWidthOrHeight: 1800,
    fileType: "image/jpeg",
    initialQuality: 0.8,
    useWebWorker: true,
  });
}
