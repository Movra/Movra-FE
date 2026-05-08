import { maxImageUploadBytes, validateImageFile } from "./imageValidation";

describe("validateImageFile", () => {
  it("allows supported image MIME types under the size limit", () => {
    const file = new File(["image"], "vision.png", { type: "image/png" });

    expect(validateImageFile(file)).toBeNull();
  });

  it("rejects unsupported image MIME types", () => {
    const file = new File(["svg"], "vision.svg", { type: "image/svg+xml" });

    expect(validateImageFile(file)).toBe(
      "PNG, JPG, WebP 이미지만 업로드할 수 있습니다.",
    );
  });

  it("rejects images over the size limit", () => {
    const file = new File([new Uint8Array(maxImageUploadBytes + 1)], "large.png", {
      type: "image/png",
    });

    expect(validateImageFile(file)).toBe("이미지는 5MB 이하로 업로드해주세요.");
  });
});
