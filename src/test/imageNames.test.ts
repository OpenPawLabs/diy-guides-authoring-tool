import { describe, expect, it } from "vitest";
import { sanitizeImageName, uniqueImageName } from "../lib/fs/imageNames";

describe("sanitizeImageName", () => {
  it("lowercases and hyphenates while keeping the extension", () => {
    expect(sanitizeImageName("My Photo (Final).JPG")).toBe("my-photo-final.jpg");
  });

  it("strips any leading directory path", () => {
    expect(sanitizeImageName("C:\\Users\\me\\Step 1.png")).toBe("step-1.png");
    expect(sanitizeImageName("nested/dir/cover image.webp")).toBe(
      "cover-image.webp",
    );
  });

  it("collapses extra dots in the stem", () => {
    expect(sanitizeImageName("board.v2.final.jpeg")).toBe("board-v2-final.jpeg");
  });

  it("falls back to image when the stem is empty", () => {
    expect(sanitizeImageName("___.png")).toBe("image.png");
    expect(sanitizeImageName(".gitkeep")).toBe("gitkeep");
  });
});

describe("uniqueImageName", () => {
  it("returns the name unchanged when free", () => {
    expect(uniqueImageName("step.jpg", ["other.png"])).toBe("step.jpg");
  });

  it("appends an incrementing suffix on collisions", () => {
    expect(uniqueImageName("step.jpg", ["step.jpg"])).toBe("step-1.jpg");
    expect(uniqueImageName("step.jpg", ["step.jpg", "step-1.jpg"])).toBe(
      "step-2.jpg",
    );
  });

  it("compares case-insensitively", () => {
    expect(uniqueImageName("Step.JPG", ["step.jpg"])).toBe("Step-1.JPG");
  });

  it("handles names without an extension", () => {
    expect(uniqueImageName("cover", ["cover"])).toBe("cover-1");
  });
});
