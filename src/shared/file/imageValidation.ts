const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
export const maxImageUploadBytes = 5 * 1024 * 1024;

export function validateImageFile(file: File) {
  if (!allowedImageTypes.has(file.type)) {
    return "PNG, JPG, WebP 이미지만 업로드할 수 있습니다.";
  }

  if (file.size > maxImageUploadBytes) {
    return "이미지는 5MB 이하로 업로드해주세요.";
  }

  return null;
}
