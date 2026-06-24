import { Alert, Button, Card } from "@heroui/react";
import { useCallback } from "react";
import { GuidePreview } from "../components/GuidePreview";
import { ChapterStatusCard } from "../components/ChapterStatusCard";
import { GuideDetailsForm } from "../components/GuideDetailsForm";
import { StepEditorPanel } from "../components/step-editor";
import { useGuideDocument } from "../hooks/useGuideDocument";
import type { ChapterStatus } from "../lib/fs/types";

interface ChapterViewProps {
  mode: "ready" | "missing-guide" | "already-exists";
  chapterHandle: FileSystemDirectoryHandle;
  chapter: ChapterStatus;
  notice?: string;
  isLoading: boolean;
  onCreateGuide: () => void;
  onUseExistingGuide: () => void;
  onCloseChapter: () => void | Promise<void>;
  onPermissionLost: (folderName?: string) => void;
}

export function ChapterView({
  mode,
  chapterHandle,
  chapter,
  notice,
  isLoading,
  onCreateGuide,
  onUseExistingGuide,
  onCloseChapter,
  onPermissionLost,
}: ChapterViewProps) {
  if (mode === "ready") {
    return (
      <ReadyChapterEditor
        chapter={chapter as ChapterStatus & { guideMdxExists: true }}
        chapterHandle={chapterHandle}
        notice={notice}
        onCloseChapter={onCloseChapter}
        onPermissionLost={onPermissionLost}
      />
    );
  }

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

interface ReadyChapterEditorProps {
  chapterHandle: FileSystemDirectoryHandle;
  chapter: ChapterStatus & { guideMdxExists: true };
  notice?: string;
  onCloseChapter: () => void | Promise<void>;
  onPermissionLost: (folderName?: string) => void;
}

function ReadyChapterEditor({
  chapterHandle,
  chapter,
  notice,
  onCloseChapter,
  onPermissionLost,
}: ReadyChapterEditorProps) {
  const document = useGuideDocument({
    directory: chapterHandle,
    initialChapter: chapter,
    onPermissionLost,
  });

  const handleCloseChapter = useCallback(() => {
    if (
      document.isDirty &&
      !window.confirm("You have unsaved changes. Close this chapter anyway?")
    ) {
      return;
    }

    void onCloseChapter();
  }, [document.isDirty, onCloseChapter]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Guide editor
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-default-950">
            {chapter.folderName}
          </h1>
          <p className="mt-2 max-w-2xl text-default-600">
            Edit each step directly on the rendered guide, drop to raw MDX when you
            need full control, and save when you are ready.
          </p>
        </div>
        <Button variant="outline" onPress={handleCloseChapter}>
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

      {document.state.status === "loading" && (
        <Card>
          <Card.Content className="p-6 text-default-600">
            Loading guide.mdx from disk...
          </Card.Content>
        </Card>
      )}

      {document.state.status === "error" && (
        <>
          <ChapterStatusCard chapter={document.state.chapter} />
          <Alert className="border border-danger-300 bg-danger-50">
            <Alert.Content>
              <Alert.Title>Could not load guide.mdx</Alert.Title>
              <Alert.Description>{document.state.message}</Alert.Description>
              <div className="mt-4">
                <Button variant="primary" onPress={() => void document.load()}>
                  Try again
                </Button>
              </div>
            </Alert.Content>
          </Alert>
        </>
      )}

      {document.state.status === "ready" && (
        <>
          <ChapterStatusCard chapter={document.state.chapter} />

          <Card>
            <Card.Header className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Card.Title>guide.mdx</Card.Title>
                <Card.Description>
                  Changes stay local until you save, then appear as a normal git
                  diff in the selected chapter folder.
                </Card.Description>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${
                    document.isDirty
                      ? "bg-warning-100 text-warning-700"
                      : "bg-success-100 text-success-700"
                  }`}
                >
                  {document.isDirty ? "Unsaved changes" : "Saved"}
                </span>
                <Button
                  isDisabled={!document.isDirty || document.state.isSaving}
                  variant="primary"
                  onPress={() => void document.save()}
                >
                  {document.state.isSaving ? "Saving..." : "Save guide.mdx"}
                </Button>
              </div>
            </Card.Header>
            <Card.Content className="space-y-4">
              {document.state.saveError && (
                <Alert className="border border-danger-300 bg-danger-50">
                  <Alert.Content>
                    <Alert.Title>Save failed</Alert.Title>
                    <Alert.Description>{document.state.saveError}</Alert.Description>
                  </Alert.Content>
                </Alert>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  variant={
                    document.state.mode === "structured" ? "primary" : "outline"
                  }
                  onPress={() => document.setMode("structured")}
                >
                  Structured
                </Button>
                <Button
                  variant={document.state.mode === "raw" ? "primary" : "outline"}
                  onPress={() => document.setMode("raw")}
                >
                  Raw MDX
                </Button>
              </div>

              {document.state.mode === "raw" && document.state.structuredError && (
                <Alert className="border border-warning-300 bg-warning-50">
                  <Alert.Content>
                    <Alert.Title>
                      Structured editing is not available for this MDX
                    </Alert.Title>
                    <Alert.Description>
                      {document.state.structuredError}
                    </Alert.Description>
                  </Alert.Content>
                </Alert>
              )}

              {document.state.warnings.length > 0 && (
                <Alert className="border border-warning-300 bg-warning-50">
                  <Alert.Content>
                    <Alert.Title>Some advanced MDX is shown in raw form</Alert.Title>
                    <Alert.Description>
                      {document.state.warnings.join(" ")}
                    </Alert.Description>
                  </Alert.Content>
                </Alert>
              )}

              {document.state.mode === "structured" && document.state.draft ? (
                <div className="flex flex-col gap-6">
                  <StepEditorPanel
                    draft={document.state.draft}
                    directory={chapterHandle}
                    updateDraft={document.updateDraft}
                  />

                  <details className="rounded-xl border border-default-200 bg-default-50">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-default-700">
                      Guide details (header, intro, tools, callouts)
                    </summary>
                    <div className="border-t border-default-200 p-4">
                      <GuideDetailsForm
                        draft={document.state.draft}
                        updateDraft={document.updateDraft}
                      />
                    </div>
                  </details>
                </div>
              ) : (
                <div className="grid gap-5 lg:grid-cols-2">
                  <section className="flex min-h-[36rem] flex-col gap-2">
                    <label
                      className="text-sm font-semibold text-default-700"
                      htmlFor="guide-mdx-source"
                    >
                      MDX source
                    </label>
                    <textarea
                      className="min-h-0 flex-1 resize-y rounded-xl border border-default-300 bg-white p-4 font-mono text-sm leading-6 text-default-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-200"
                      id="guide-mdx-source"
                      spellCheck={false}
                      value={document.state.rawSource}
                      onChange={(event) => document.setRawSource(event.target.value)}
                    />
                  </section>

                  <section className="flex min-h-[36rem] flex-col gap-2">
                    <h2 className="text-sm font-semibold text-default-700">
                      Live preview
                    </h2>
                    <div className="min-h-0 flex-1 overflow-auto rounded-xl bg-default-50 p-3">
                      <GuidePreview
                        directory={chapterHandle}
                        source={document.state.rawSource}
                      />
                    </div>
                  </section>
                </div>
              )}
            </Card.Content>
          </Card>
        </>
      )}
    </main>
  );
}
