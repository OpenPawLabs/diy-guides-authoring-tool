import { cn } from "@heroui/react";
import type { LinkItemDraft } from "../../lib/mdx/structuredGuide";

interface LinkItemMenuProps {
  link: LinkItemDraft;
  onChange: (mutate: (link: LinkItemDraft) => void) => void;
  /** Trigger the editor's file picker to upload a downloadable asset. */
  onUploadFile: () => void;
}

const fieldClass =
  "w-full rounded-md border border-default-200 bg-default-50 px-2 py-1 text-sm outline-none transition focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent";

const labelClass = "block text-xs font-semibold text-default-500";

/**
 * Editor for a single `LinkButton` option: its label, destination (a typed URL /
 * path or an uploaded file), and whether it downloads or navigates.
 */
export function LinkItemMenu({ link, onChange, onUploadFile }: LinkItemMenuProps) {
  const isDownload = Boolean(link.download);

  return (
    <div className="w-72 rounded-lg border border-default-200 bg-background p-3 shadow-lg">
      <label className={labelClass} htmlFor="link-label">
        Label
      </label>
      <input
        id="link-label"
        value={link.label}
        placeholder="Download 3MF"
        onChange={(event) =>
          onChange((item) => void (item.label = event.target.value))
        }
        className={cn(fieldClass, "mt-1")}
      />

      <label className={cn(labelClass, "mt-2.5")} htmlFor="link-href">
        Link or file path
      </label>
      <div className="mt-1 flex gap-1.5">
        <input
          id="link-href"
          value={link.href}
          placeholder="https://… or ./files/…"
          onChange={(event) =>
            onChange((item) => void (item.href = event.target.value))
          }
          className={fieldClass}
        />
        <button
          type="button"
          onClick={onUploadFile}
          className="shrink-0 rounded-md bg-default-100 px-2 py-1 text-sm font-medium transition hover:bg-default-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Upload
        </button>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isDownload}
          onChange={(event) =>
            onChange((item) => void (item.download = event.target.checked))
          }
        />
        Download file
      </label>
      <label
        className={cn(
          "mt-1.5 flex items-center gap-2 text-sm",
          isDownload && "opacity-40",
        )}
      >
        <input
          type="checkbox"
          checked={Boolean(link.external)}
          disabled={isDownload}
          onChange={(event) =>
            onChange(
              (item) => void (item.external = event.target.checked || undefined),
            )
          }
        />
        Open in new tab
      </label>
    </div>
  );
}
