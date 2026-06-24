import { Card } from "@heroui/react";
import { DifficultyBadge } from "@openpawlabs/diy-guides-ui";
import { Link as RouterLink } from "react-router-dom";
import { guideActivityTime, type StoredGuide } from "../lib/fs/guideStore";

interface GuideCardProps {
  guide: StoredGuide;
  onForget?: (id: string) => void;
}

export function GuideCard({ guide, onForget }: GuideCardProps) {
  return (
    <div className="relative h-full">
      <RouterLink
        to={`/guide/${guide.id}`}
        className="block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
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
