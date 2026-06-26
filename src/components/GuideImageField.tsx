import { cn } from "@heroui/react";
import { useRef } from "react";
import { useResolvedImageSrc } from "../hooks/useResolvedImageSrc";
import { writeImageFile } from "../lib/fs/guideFiles";
import { isImageFile, THUMBNAIL_FILE_ACCEPT } from "../lib/mediaTypes";

export interface GuideImageFieldProps {
  directory: FileSystemDirectoryHandle;
  /** Relative MDX path, e.g. `./images/hero.jpg`. */
  src?: string;
  onChange: (src: string | undefined) => void;
  label: string;
  /** `sm` for tool-list thumbnails; `hero` for the guide header image. */
  size?: "sm" | "hero";
  /** When true, preview uses a 4:3 frame (guide hero). @default false */
  previewAspect?: boolean;
}

const labelClass = "block text-xs font-semibold text-default-500";

const sizeClasses: Record<NonNullable<GuideImageFieldProps["size"]>, string> = {
  sm: "size-14",
  hero: "h-32 w-auto aspect-[4/3]",
};

/**
 * Upload-only image control for guide assets. Writes into the guide's `images/`
 * folder and stores the relative MDX path on the draft.
 */
export function GuideImageField({
  directory,
  src,
  onChange,
  label,
  size = "sm",
  previewAspect = false,
}: GuideImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewSrc = useResolvedImageSrc(directory, src ?? "");
  const previewClass = cn(
    sizeClasses[size],
    previewAspect && size === "sm" && "aspect-square",
    previewAspect && size === "hero" && "aspect-[4/3]",
  );

  const openPicker = () => inputRef.current?.click();

  const handleFile = async (file: File | undefined) => {
    if (!file || !isImageFile(file)) {
      return;
    }

    try {
      const relativePath = await writeImageFile(directory, file);
      onChange(relativePath);
    } catch (error) {
      console.error("Failed to save the image to the guide folder.", error);
    }
  };

  return (
    <div>
      <span className={labelClass}>{label}</span>
      <div className="mt-1 flex items-start gap-2">
        {src ? (
          <button
            type="button"
            onClick={openPicker}
            className={cn(
              "group relative shrink-0 overflow-hidden rounded-md border border-default-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              previewClass,
            )}
            aria-label={`Replace ${label.toLowerCase()}`}
          >
            <img src={previewSrc} alt="" className="size-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
              Replace
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={openPicker}
            className={cn(
              "flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-md border-2 border-dashed border-default-300 bg-default-50 text-default-500 transition",
              "hover:border-accent hover:text-accent focus-visible:border-accent focus-visible:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              previewClass,
            )}
            aria-label={`Upload ${label.toLowerCase()}`}
          >
            <span className="text-lg leading-none">+</span>
            <span className="text-[10px] font-medium">Upload</span>
          </button>
        )}
        {src && (
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
