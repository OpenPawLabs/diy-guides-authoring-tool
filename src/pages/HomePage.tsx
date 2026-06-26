import { Alert, Button, Card, Link, Spinner } from "@heroui/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConfirmModal } from "../components/ConfirmModal";
import { GuideCard } from "../components/GuideCard";
import { useGuideLibrary } from "../hooks/useGuideLibrary";
import type { StoredGuide } from "../lib/fs/guideStore";

const workflowSteps = [
  "Clone a guide repository locally.",
  "Open this authoring tool in Chrome.",
  "Open a guide folder to grant access.",
  "Edit each step on the rendered guide and save.",
  "Use git outside the tool to review, commit, and push.",
];

export function HomePage() {
  const navigate = useNavigate();
  const { guides, draftIds, error, openFolder, forget } = useGuideLibrary();
  const [pendingForget, setPendingForget] = useState<StoredGuide | null>(null);
  const hasPendingEdits =
    pendingForget !== null && draftIds.has(pendingForget.id);

  const handleOpenFolder = async () => {
    const id = await openFolder();
    if (id) {
      navigate(`/guide/${id}`);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            OpenPawLabs
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-default-950 sm:text-5xl">
            Guides
          </h1>
          <p className="max-w-2xl text-lg text-default-600">
            Pick up where you left off, or open a guide folder from a cloned
            repository to start editing.
          </p>
        </div>
        <Button size="lg" variant="primary" onPress={() => void handleOpenFolder()}>
          Open guide folder
        </Button>
      </header>

      {error && (
        <Alert className="border border-danger-300 bg-danger-50">
          <Alert.Content>
            <Alert.Title>Could not open the folder</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {guides === null ? (
        <div className="flex items-center gap-3 text-default-600">
          <Spinner />
          <span>Loading your guides...</span>
        </div>
      ) : guides.length === 0 ? (
        <EmptyState />
      ) : (
        <section
          aria-label="Recently edited guides"
          className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5"
        >
          {guides.map((guide) => (
            <GuideCard
              key={guide.id}
              guide={guide}
              hasPendingEdits={draftIds.has(guide.id)}
              onForget={(id) =>
                setPendingForget(guides.find((g) => g.id === id) ?? null)
              }
            />
          ))}
        </section>
      )}

      <ConfirmModal
        isOpen={pendingForget !== null}
        heading="Remove this guide from recents?"
        body={
          <>
            <p>
              This removes{" "}
              <strong>
                {pendingForget?.title || pendingForget?.folderName}
              </strong>{" "}
              from your guides list
              {hasPendingEdits && " and discards any unsaved edits stored for it"}
              . The folder and <code>guide.mdx</code> on disk are not touched,
              and you can open it again anytime.
            </p>
            {hasPendingEdits && (
              <p className="mt-3 font-medium !text-danger">
                This guide has unsaved edits that will be permanently deleted if
                you remove it.
              </p>
            )}
          </>
        }
        confirmLabel="Remove from recents"
        onCancel={() => setPendingForget(null)}
        onConfirm={() => {
          if (pendingForget) {
            void forget(pendingForget.id);
          }
          setPendingForget(null);
        }}
      />
    </main>
  );
}

function EmptyState() {
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <Card>
        <Card.Header>
          <Card.Title>No guides yet</Card.Title>
          <Card.Description>
            Open a guide folder to add it here. Every folder you edit is
            remembered so you can jump back in.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <ol className="grid gap-3 sm:grid-cols-2">
            {workflowSteps.map((step, index) => (
              <li
                className="flex gap-3 rounded-xl border border-default-200 bg-white p-4"
                key={step}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <span className="text-sm text-default-700">{step}</span>
              </li>
            ))}
          </ol>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>Chrome and local folders</Card.Title>
          <Card.Description>
            Folder access is granted locally in the browser.
          </Card.Description>
        </Card.Header>
        <Card.Content className="space-y-4">
          <Alert className="border border-primary-200 bg-primary-50">
            <Alert.Content>
              <Alert.Title>No uploads and no accounts</Alert.Title>
              <Alert.Description>
                The hosted app receives permission to your selected folder and
                writes guide.mdx plus images/ there. Git stays outside the
                authoring tool.
              </Alert.Description>
            </Alert.Content>
          </Alert>
          <p className="text-sm text-default-600">
            Need a content repo to test against? Use{" "}
            <Link
              href="https://github.com/OpenPawLabs/diy-guides"
              rel="noreferrer"
              target="_blank"
            >
              OpenPawLabs/diy-guides
            </Link>
            .
          </p>
        </Card.Content>
      </Card>
    </section>
  );
}
