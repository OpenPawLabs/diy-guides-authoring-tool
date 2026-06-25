/** Media kinds supported by `MediaFigure` in step media uploads. */
export type StepMediaType = "image" | "video" | "model";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;
const VIDEO_EXTENSIONS = ["mp4", "m4v"] as const;
const MODEL_EXTENSIONS = ["3mf", "stl", "step"] as const;

const EXTENSIONS_BY_TYPE: Record<StepMediaType, readonly string[]> = {
  image: IMAGE_EXTENSIONS,
  video: VIDEO_EXTENSIONS,
  model: MODEL_EXTENSIONS,
};

/** File extensions allowed for step media uploads, grouped by kind. */
export const SUPPORTED_MEDIA_EXTENSIONS = [
  ...IMAGE_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
  ...MODEL_EXTENSIONS,
] as const;

/**
 * Narrow `accept` value for the hidden file input. Explicit extensions avoid
 * Windows expanding `image/*` into a huge filter list that freezes the browser
 * when authors switch to "All Files".
 */
export const STEP_MEDIA_FILE_ACCEPT = SUPPORTED_MEDIA_EXTENSIONS.map(
  (ext) => `.${ext}`,
).join(",");

function extensionOf(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? fileName;
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

/** Map a supported file extension to its `MediaFigure` type. */
export function mediaTypeFromExtension(extension: string): StepMediaType | null {
  const normalized = extension.toLowerCase();
  for (const [type, extensions] of Object.entries(EXTENSIONS_BY_TYPE) as [
    StepMediaType,
    readonly string[],
  ][]) {
    if (extensions.includes(normalized)) {
      return type;
    }
  }
  return null;
}

/** Infer the media type from an uploaded file name or MIME type. */
export function mediaTypeFromFile(file: File): StepMediaType | null {
  const fromName = mediaTypeFromExtension(extensionOf(file.name));
  if (fromName) {
    return fromName;
  }

  const mime = file.type.toLowerCase();
  if (mime.startsWith("image/")) {
    return "image";
  }
  if (mime.startsWith("video/")) {
    return "video";
  }
  if (mime.includes("3d") || mime.includes("model") || mime.includes("step")) {
    return "model";
  }

  return null;
}

/** Whether a file is one of the supported step media uploads. */
export function isSupportedMediaFile(file: File): boolean {
  return mediaTypeFromFile(file) != null;
}
