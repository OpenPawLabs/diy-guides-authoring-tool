import type { ReactNode } from "react";
import { Card, Chip } from "@heroui/react";
import type { ChapterStatus } from "../lib/fs/types";

interface ChapterStatusCardProps {
  chapter: ChapterStatus;
}

export function ChapterStatusCard({ chapter }: ChapterStatusCardProps) {
  return (
    <Card>
      <Card.Header>
        <Card.Title>{chapter.folderName}</Card.Title>
        <Card.Description>Selected chapter folder</Card.Description>
      </Card.Header>
      <Card.Content>
        <dl className="grid gap-4 sm:grid-cols-2">
          <StatusItem label="guide.mdx">
            <Chip color={chapter.guideMdxExists ? "success" : "warning"}>
              {chapter.guideMdxExists ? "Exists" : "Missing"}
            </Chip>
          </StatusItem>
          <StatusItem label="images/">
            <Chip color={chapter.imagesDirExists ? "success" : "warning"}>
              {chapter.imagesDirExists ? "Ready" : "Not found"}
            </Chip>
          </StatusItem>
          {chapter.guideMdxLastModified != null && (
            <StatusItem label="Last modified">
              <span>{formatDate(chapter.guideMdxLastModified)}</span>
            </StatusItem>
          )}
          {chapter.guideMdxSize != null && (
            <StatusItem label="File size">
              <span>{formatBytes(chapter.guideMdxSize)}</span>
            </StatusItem>
          )}
        </dl>
      </Card.Content>
    </Card>
  );
}

function StatusItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-default-200 bg-white p-4">
      <dt className="text-sm font-medium text-default-500">{label}</dt>
      <dd className="mt-2 text-sm text-default-900">{children}</dd>
    </div>
  );
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  return `${(bytes / 1024).toFixed(1)} KB`;
}
