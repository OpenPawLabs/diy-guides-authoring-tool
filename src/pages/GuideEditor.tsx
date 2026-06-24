import { Alert, Button, Card } from "@heroui/react";
import { DiskConflictModal } from "../components/DiskConflictModal";
import { GuidePreview } from "../components/GuidePreview";
import { GuideStatusCard } from "../components/GuideStatusCard";
import { GuideDetailsForm } from "../components/GuideDetailsForm";
import { StepEditorPanel } from "../components/step-editor";
import { useGuideDocument } from "../hooks/useGuideDocument";
import type { GuideFolderStatus } from "../lib/fs/types";

interface GuideEditorProps {
  guideId: string;
  directory: FileSystemDirectoryHandle;
  guide: GuideFolderStatus & { guideMdxExists: true };
  notice?: string;
  onClose: () => void;
  onPermissionLost: (folderName?: string) => void;
}

export function GuideEditor({
  guideId,
  directory,
  guide,
  notice,
  onClose,
  onPermissionLost,
}: GuideEditorProps) {
  const document = useGuideDocument({
    guideId,
    directory,
    initialGuide: guide,
    onPermissionLost,
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Guide editor
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-default-950">
            {guide.folderName}
          </h1>
          <p className="mt-2 max-w-2xl text-default-600">
            Edit each step directly on the rendered guide, drop to raw MDX when
            you need full control, and save when you are ready.
          </p>
        </div>
        <Button variant="outline" onPress={onClose}>
          Back to guides
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
          <GuideStatusCard guide={document.state.guide} />
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
          <GuideStatusCard guide={document.state.guide} />

          <Card>
            <Card.Header className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Card.Title>guide.mdx</Card.Title>
                <Card.Description>
                  Changes stay local until you save, then appear as a normal git
                  diff in the selected guide folder.
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
                    directory={directory}
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
                        directory={directory}
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

      <DiskConflictModal
        isOpen={document.hasConflict}
        onKeepEdits={document.keepEdits}
        onReloadFromDisk={() => void document.reloadFromDisk()}
      />
    </main>
  );
}
