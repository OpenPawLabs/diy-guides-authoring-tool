import { GuideImageField } from "./GuideImageField";

interface ToolItemThumbnailFieldProps {
  directory: FileSystemDirectoryHandle;
  thumbnail?: string;
  onChange: (thumbnail: string | undefined) => void;
}

/**
 * Upload-only thumbnail control for a tools/parts list item. Writes images into
 * the guide's `images/` folder and stores the relative MDX path on the draft.
 */
export function ToolItemThumbnailField({
  directory,
  thumbnail,
  onChange,
}: ToolItemThumbnailFieldProps) {
  return (
    <GuideImageField
      directory={directory}
      src={thumbnail}
      onChange={onChange}
      label="Thumbnail"
      size="sm"
    />
  );
}
