import { Alert, Button, Card, Link } from "@heroui/react";
import { PermissionLostBanner } from "../components/PermissionLostBanner";
import { WorkflowSteps } from "../components/WorkflowSteps";

interface LandingPageProps {
  isLoading: boolean;
  permissionLostFolderName?: string;
  onOpenChapter: () => void;
  onStartNewChapter: () => void;
}

export function LandingPage({
  isLoading,
  permissionLostFolderName,
  onOpenChapter,
  onStartNewChapter,
}: LandingPageProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              OpenPawLabs
            </p>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-default-950 sm:text-5xl">
              Create DIY guide chapters from a local folder.
            </h1>
            <p className="max-w-2xl text-lg text-default-600">
              Clone a guide repo, open this page in Chrome, grant access to a
              chapter folder, and let the tool create or confirm the files Phase
              2 will edit and preview.
            </p>
          </div>

          {permissionLostFolderName && (
            <PermissionLostBanner
              folderName={permissionLostFolderName}
              onReopenFolder={onOpenChapter}
            />
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              isDisabled={isLoading}
              size="lg"
              variant="primary"
              onPress={onOpenChapter}
            >
              Open chapter folder
            </Button>
            <Button
              isDisabled={isLoading}
              size="lg"
              variant="outline"
              onPress={onStartNewChapter}
            >
              Start new chapter
            </Button>
          </div>
        </div>

        <Card>
          <Card.Header>
            <Card.Title>Chrome-only for Phase 1</Card.Title>
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
                  writes `guide.mdx` plus `images/` there. Git stays outside the
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

      <WorkflowSteps />
    </main>
  );
}
