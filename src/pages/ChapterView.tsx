import { Alert, Button, Card } from "@heroui/react";
import { ChapterStatusCard } from "../components/ChapterStatusCard";
import type { ChapterStatus } from "../lib/fs/types";

interface ChapterViewProps {
  mode: "ready" | "missing-guide" | "already-exists";
  chapter: ChapterStatus;
  notice?: string;
  isLoading: boolean;
  onCreateGuide: () => void;
  onUseExistingGuide: () => void;
  onCloseChapter: () => void;
}

export function ChapterView({
  mode,
  chapter,
  notice,
  isLoading,
  onCreateGuide,
  onUseExistingGuide,
  onCloseChapter,
}: ChapterViewProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Chapter folder
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-default-950">
            {headingForMode(mode)}
          </h1>
          <p className="mt-2 max-w-2xl text-default-600">
            Phase 1 confirms the local folder and prepares the files needed for
            MDX editing and live preview in Phase 2.
          </p>
        </div>
        <Button variant="outline" onPress={onCloseChapter}>
          Close chapter
        </Button>
      </header>

      {notice && (
        <Alert className="border border-success-300 bg-success-50">
          <Alert.Content>
            <Alert.Title>Folder ready</Alert.Title>
            <Alert.Description>{notice}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {mode === "missing-guide" && (
        <Alert className="border border-warning-300 bg-warning-50">
          <Alert.Content>
            <Alert.Title>guide.mdx is missing</Alert.Title>
            <Alert.Description>
              This folder can be initialized as a guide chapter. The tool will
              create a blank `guide.mdx` template and an `images/` directory.
            </Alert.Description>
            <div className="mt-4">
              <Button
                isDisabled={isLoading}
                variant="secondary"
                onPress={onCreateGuide}
              >
                Create guide.mdx from template
              </Button>
            </div>
          </Alert.Content>
        </Alert>
      )}

      {mode === "already-exists" && (
        <Alert className="border border-primary-200 bg-primary-50">
          <Alert.Content>
            <Alert.Title>guide.mdx already exists</Alert.Title>
            <Alert.Description>
              The selected folder already has a guide file, so the new-chapter
              flow stopped before writing anything. You can open the existing
              guide instead.
            </Alert.Description>
            <div className="mt-4">
              <Button variant="primary" onPress={onUseExistingGuide}>
                Open existing guide
              </Button>
            </div>
          </Alert.Content>
        </Alert>
      )}

      <ChapterStatusCard chapter={chapter} />

      {mode === "ready" && (
        <Card>
          <Card.Header>
            <Card.Title>Editing and preview come next</Card.Title>
            <Card.Description>
              Phase 2 will load `guide.mdx`, render a live MDX preview, and save
              edits back to this folder.
            </Card.Description>
          </Card.Header>
        </Card>
      )}
    </main>
  );
}

function headingForMode(mode: ChapterViewProps["mode"]): string {
  if (mode === "missing-guide") {
    return "Initialize this chapter";
  }

  if (mode === "already-exists") {
    return "Existing chapter found";
  }

  return "Chapter folder ready";
}
