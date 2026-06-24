import type { ReactNode } from "react";
import { Card, Chip } from "@heroui/react";
import type { GuideFolderStatus } from "../lib/fs/types";

interface GuideStatusCardProps {
  guide: GuideFolderStatus;
}

export function GuideStatusCard({ guide }: GuideStatusCardProps) {
  return (
    <Card>
      <Card.Header>
        <Card.Title>{guide.folderName}</Card.Title>
        <Card.Description>Selected guide folder</Card.Description>
      </Card.Header>
      <Card.Content>
        <dl className="grid gap-4 sm:grid-cols-2">
          <StatusItem label="guide.mdx">
            <Chip color={guide.guideMdxExists ? "success" : "warning"}>
              {guide.guideMdxExists ? "Exists" : "Missing"}
            </Chip>
          </StatusItem>
          <StatusItem label="images/">
            <Chip color={guide.imagesDirExists ? "success" : "warning"}>
              {guide.imagesDirExists ? "Ready" : "Not found"}
            </Chip>
          </StatusItem>
          {guide.guideMdxLastModified != null && (
            <StatusItem label="Last modified">
              <span>{formatDate(guide.guideMdxLastModified)}</span>
            </StatusItem>
          )}
          {guide.guideMdxSize != null && (
            <StatusItem label="File size">
              <span>{formatBytes(guide.guideMdxSize)}</span>
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
