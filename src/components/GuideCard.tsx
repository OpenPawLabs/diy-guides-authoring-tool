import { Button, Card } from "@heroui/react";
import { DifficultyBadge } from "@openpawlabs/diy-guides-ui";
import { Link as RouterLink } from "react-router-dom";
import { guideActivityTime, type StoredGuide } from "../lib/fs/guideStore";

interface GuideCardProps {
  guide: StoredGuide;
  hasPendingEdits?: boolean;
  onForget?: (id: string) => void;
}

export function GuideCard({ guide, hasPendingEdits, onForget }: GuideCardProps) {
  return (
    <div className="relative flex h-full flex-col gap-2">
      <RouterLink
        to={`/guide/${guide.id}`}
        className="block flex-1 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
      >
        <Card className="h-full transition hover:border-primary-300 hover:shadow-md">
          <Card.Header>
            <Card.Title className="line-clamp-2 pr-6">
              {guide.title || guide.folderName}
            </Card.Title>
            <Card.Description className="truncate">
              {guide.folderName}
            </Card.Description>
          </Card.Header>
          <Card.Content className="flex flex-col gap-3">
            {guide.difficulty && (
              <DifficultyBadge difficulty={guide.difficulty} size="sm" />
            )}
            <span className="text-sm text-default-500">
              Edited {formatRelativeTime(guideActivityTime(guide))}
            </span>
          </Card.Content>
        </Card>
      </RouterLink>

      <Button
        aria-label={`Full preview of ${guide.title || guide.folderName}`}
        className="h-auto min-h-9 w-full py-2"
        size="sm"
        variant="outline"
        onPress={() => openFullPreview(guide.id)}
      >
        <span className="flex flex-col items-center gap-0.5 leading-tight">
          {hasPendingEdits && (
            <span className="text-xs font-normal text-warning">
              Note: Unsaved edits not shown
            </span>
          )}
          <span>Full screen preview</span>
        </span>
      </Button>

      {onForget && (
        <button
          aria-label={`Remove ${guide.folderName} from recents`}
          className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full text-lg leading-none text-default-400 transition hover:bg-default-100 hover:text-default-700"
          onClick={() => onForget(guide.id)}
          type="button"
        >
          &times;
        </button>
      )}
    </div>
  );
}

function openFullPreview(guideId: string) {
  const base = `${window.location.origin}${window.location.pathname}`;
  window.open(`${base}#/guide/${guideId}/preview`, "_blank", "noopener,noreferrer");
}

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const divisions: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.34524, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];

  let duration = seconds;
  for (const [amount, unit] of divisions) {
    if (Math.abs(duration) < amount) {
      return formatter.format(Math.round(duration), unit);
    }
    duration /= amount;
  }

  return formatter.format(Math.round(duration), "year");
}
