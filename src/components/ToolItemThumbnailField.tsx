import { cn } from "@heroui/react";
import { useRef } from "react";
import { useResolvedImageSrc } from "../hooks/useResolvedImageSrc";
import { writeImageFile } from "../lib/fs/guideFiles";
import { isImageFile, THUMBNAIL_FILE_ACCEPT } from "../lib/mediaTypes";

interface ToolItemThumbnailFieldProps {
  directory: FileSystemDirectoryHandle;
  thumbnail?: string;
  onChange: (thumbnail: string | undefined) => void;
}

const labelClass = "block text-xs font-semibold text-default-500";

/**
 * Upload-only thumbnail control for a tools/parts list item. Writes images into
 * the guide's `images/` folder and stores the relative MDX path on the draft.
 */
export function ToolItemThumbnailField({
  directory,
  thumbnail,
  onChange,
}: ToolItemThumbnailFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewSrc = useResolvedImageSrc(directory, thumbnail ?? "");

  const openPicker = () => inputRef.current?.click();

  const handleFile = async (file: File | undefined) => {
    if (!file || !isImageFile(file)) {
      return;
    }

    try {
      const src = await writeImageFile(directory, file);
      onChange(src);
    } catch (error) {
      console.error("Failed to save the thumbnail to the guide folder.", error);
    }
  };

  return (
    <div>
      <span className={labelClass}>Thumbnail</span>
      <div className="mt-1 flex items-start gap-2">
        {thumbnail ? (
          <button
            type="button"
            onClick={openPicker}
            className="group relative size-14 shrink-0 overflow-hidden rounded-md border border-default-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Replace thumbnail"
          >
            <img
              src={previewSrc}
              alt=""
              className="size-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
              Replace
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={openPicker}
            className={cn(
              "flex size-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md border-2 border-dashed border-default-300 bg-default-50 text-default-500 transition",
              "hover:border-accent hover:text-accent focus-visible:border-accent focus-visible:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            )}
            aria-label="Upload thumbnail"
          >
            <span className="text-lg leading-none">+</span>
            <span className="text-[10px] font-medium">Upload</span>
          </button>
        )}
        {thumbnail && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="rounded-md px-2 py-1 text-xs font-medium text-default-600 transition hover:bg-default-100 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Remove
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={THUMBNAIL_FILE_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          void handleFile(file);
        }}
      />
    </div>
  );
}
