import { describe, expect, it } from "vitest";
import {
  mediaTypeFromExtension,
  mediaTypeFromFile,
  isSupportedMediaFile,
  STEP_MEDIA_FILE_ACCEPT,
} from "../lib/mediaTypes";

describe("mediaTypes", () => {
  it("uses explicit extensions instead of image/*", () => {
    expect(STEP_MEDIA_FILE_ACCEPT).toContain(".jpg");
    expect(STEP_MEDIA_FILE_ACCEPT).toContain(".webp");
    expect(STEP_MEDIA_FILE_ACCEPT).toContain(".mp4");
    expect(STEP_MEDIA_FILE_ACCEPT).toContain(".stl");
    expect(STEP_MEDIA_FILE_ACCEPT).not.toContain("image/*");
  });

  it("maps supported extensions to media types", () => {
    expect(mediaTypeFromExtension("jpg")).toBe("image");
    expect(mediaTypeFromExtension("PNG")).toBe("image");
    expect(mediaTypeFromExtension("mp4")).toBe("video");
    expect(mediaTypeFromExtension("m4v")).toBe("video");
    expect(mediaTypeFromExtension("stl")).toBe("model");
    expect(mediaTypeFromExtension("3mf")).toBe("model");
    expect(mediaTypeFromExtension("step")).toBe("model");
    expect(mediaTypeFromExtension("gif")).toBeNull();
  });

  it("recognizes supported upload files", () => {
    expect(isSupportedMediaFile(new File([], "photo.jpg"))).toBe(true);
    expect(isSupportedMediaFile(new File([], "clip.mp4"))).toBe(true);
    expect(isSupportedMediaFile(new File([], "part.stl"))).toBe(true);
    expect(isSupportedMediaFile(new File([], "notes.txt"))).toBe(false);
  });

  it("falls back to MIME type when the extension is missing", () => {
    expect(mediaTypeFromFile(new File([], "blob", { type: "video/mp4" }))).toBe(
      "video",
    );
  });
});
