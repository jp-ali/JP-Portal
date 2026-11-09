export const TRAINER_VISIT_PHOTO_KB = 80;
export const TRAINER_EXPENSE_PHOTO_KB = 65;
export const TRAINER_SOURCE_PHOTO_MB = 12;

const allowedPhotoType = /^(image\/(jpeg|png|webp|heic|heif))$/i;
const heicName = /\.(heic|heif)$/i;

export function checkTrainerPhotoFile(file) {
  if (!file || !(allowedPhotoType.test(file.type || "") || heicName.test(file.name || ""))) {
    throw new Error("Choose a JPEG, PNG, WebP or HEIC photo.");
  }
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > TRAINER_SOURCE_PHOTO_MB * 1024 * 1024) {
    throw new Error(`Choose a photo under ${TRAINER_SOURCE_PHOTO_MB} MB.`);
  }
}

export function photoDataUrlBytes(dataUrl) {
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(String(dataUrl || ""));
  if (!match) return 0;
  const base64 = match[2];
  return Math.floor(base64.length * 3 / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
}

export function checkTrainerCompressedPhoto(dataUrl, limitKB, label) {
  const bytes = photoDataUrlBytes(dataUrl);
  if (!bytes || bytes > limitKB * 1024) {
    throw new Error(`${label} photo could not fit under ${limitKB} KB. Try another photo or retake it.`);
  }
  return dataUrl;
}
