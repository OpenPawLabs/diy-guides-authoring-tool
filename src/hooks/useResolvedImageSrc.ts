import { useEffect, useState } from "react";
import { IMAGES_DIR } from "../lib/fs/constants";

/** Inline placeholder shown when a referenced `./images/...` file is not on disk. */
export const MISSING_IMAGE_SRC = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#f1f5f9"/>
  <rect x="80" y="80" width="640" height="440" rx="24" fill="none" stroke="#94a3b8" stroke-width="8" stroke-dasharray="24 20"/>
  <text x="400" y="292" text-anchor="middle" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#475569">Missing image</text>
  <text x="400" y="344" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#64748b">Add this file under images/</text>
</svg>
`)}`;

/**
 * Resolve a guide image source for display in the browser. Relative chapter
 * paths (`./images/...`) are read from the selected folder and exposed as blob
 * URLs; anything else (remote URLs, data URIs) is returned untouched. Missing
 * local files fall back to {@link MISSING_IMAGE_SRC}.
 */
export function useResolvedImageSrc(
  directory: FileSystemDirectoryHandle,
  src: string,
): string {
  const imagePath = imageAssetPath(src);
  const [resolvedAsset, setResolvedAsset] = useState<{
    directory: FileSystemDirectoryHandle;
    path: string;
    src: string;
  } | null>(null);

  useEffect(() => {
    if (!imagePath) {
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    resolveImageAsset(directory, imagePath)
      .then((file) => {
        objectUrl = URL.createObjectURL(file);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }

        setResolvedAsset({ directory, path: imagePath, src: objectUrl });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [directory, imagePath]);

  if (!imagePath) {
    return src;
  }

  return resolvedAsset?.directory === directory && resolvedAsset.path === imagePath
    ? resolvedAsset.src
    : MISSING_IMAGE_SRC;
}

/**
 * Resolve a stable-length list of guide image sources to displayable URLs in a
 * single effect. Use this (instead of mapping {@link useResolvedImageSrc}) when
 * the number of images can change, so the rules of hooks are not violated and the
 * resolved elements stay real `MediaFigure` children for the gallery.
 */
export function useResolvedImageSrcs(
  directory: FileSystemDirectoryHandle,
  srcs: string[],
): string[] {
  const key = srcs.join("\n");
  const [resolved, setResolved] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const createdUrls: string[] = [];
    const sources = key ? key.split("\n") : [];
    const next: Record<string, string> = {};

    void Promise.all(
      sources.map(async (src) => {
        const path = imageAssetPath(src);
        if (!path) {
          next[src] = src;
          return;
        }

        try {
          const file = await resolveImageAsset(directory, path);
          const url = URL.createObjectURL(file);
          createdUrls.push(url);
          next[src] = url;
        } catch {
          next[src] = MISSING_IMAGE_SRC;
        }
      }),
    ).then(() => {
      if (cancelled) {
        createdUrls.forEach(URL.revokeObjectURL);
        return;
      }
      setResolved(next);
    });

    return () => {
      cancelled = true;
      createdUrls.forEach(URL.revokeObjectURL);
    };
  }, [directory, key]);

  return srcs.map((src) =>
    imageAssetPath(src) ? (resolved[src] ?? MISSING_IMAGE_SRC) : src,
  );
}

function imageAssetPath(src: string): string | null {
  const normalized = src.replaceAll("\\", "/").replace(/^\.?\//, "");
  const prefix = `${IMAGES_DIR}/`;

  if (!normalized.startsWith(prefix)) {
    return null;
  }

  return normalized.slice(prefix.length);
}

/** Base file name from a guide asset path such as `./images/part.stl`. */
export function assetBaseName(src: string): string | undefined {
  const normalized = src.replaceAll("\\", "/");
  const name = normalized.split("/").pop();
  return name || undefined;
}

async function resolveImageAsset(
  directory: FileSystemDirectoryHandle,
  imagePath: string,
): Promise<File> {
  const parts = imagePath.split("/").filter(Boolean);
  let current = await directory.getDirectoryHandle(IMAGES_DIR);

  for (const part of parts.slice(0, -1)) {
    current = await current.getDirectoryHandle(part);
  }

  const fileName = parts.at(-1);
  if (!fileName) {
    throw new Error("Image path is empty.");
  }

  return await (await current.getFileHandle(fileName)).getFile();
}
