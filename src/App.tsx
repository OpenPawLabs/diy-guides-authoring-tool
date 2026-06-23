import { Alert, Button, Card, Spinner } from "@heroui/react";
import { BrowserGate } from "./components/BrowserGate";
import { useChapterFolder } from "./hooks/useChapterFolder";
import { ChapterView } from "./pages/ChapterView";
import { LandingPage } from "./pages/LandingPage";

export function App() {
  const {
    state,
    openChapterFolder,
    startNewChapter,
    createGuideInCurrentFolder,
    useExistingGuide,
    closeChapter,
    clearError,
  } = useChapterFolder();

  return (
    <BrowserGate>
      {state.status === "restoring" && <LoadingPage label="Checking folder access" />}
      {state.status === "loading" && <LoadingPage label={loadingLabel(state.action)} />}
      {state.status === "idle" && (
        <LandingPage
          isLoading={false}
          permissionLostFolderName={state.permissionLostFolderName}
          onOpenChapter={openChapterFolder}
          onStartNewChapter={startNewChapter}
        />
      )}
      {state.status === "permission-lost" && (
        <LandingPage
          isLoading={false}
          permissionLostFolderName={state.folderName}
          onOpenChapter={openChapterFolder}
          onStartNewChapter={startNewChapter}
        />
      )}
      {state.status === "error" && (
        <ErrorPage message={state.message} onReturn={clearError} />
      )}
      {state.status === "ready" && (
        <ChapterView
          chapter={state.chapter}
          isLoading={false}
          mode="ready"
          notice={state.notice}
          onCloseChapter={closeChapter}
          onCreateGuide={createGuideInCurrentFolder}
          onUseExistingGuide={useExistingGuide}
        />
      )}
      {state.status === "missing-guide" && (
        <ChapterView
          chapter={state.chapter}
          isLoading={false}
          mode="missing-guide"
          onCloseChapter={closeChapter}
          onCreateGuide={createGuideInCurrentFolder}
          onUseExistingGuide={useExistingGuide}
        />
      )}
      {state.status === "already-exists" && (
        <ChapterView
          chapter={state.chapter}
          isLoading={false}
          mode="already-exists"
          onCloseChapter={closeChapter}
          onCreateGuide={createGuideInCurrentFolder}
          onUseExistingGuide={useExistingGuide}
        />
      )}
    </BrowserGate>
  );
}

function LoadingPage({ label }: { label: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <Card className="w-full max-w-md">
        <Card.Content className="flex items-center gap-4 p-6">
          <Spinner />
          <span className="font-medium text-default-700">{label}</span>
        </Card.Content>
      </Card>
    </main>
  );
}

function ErrorPage({
  message,
  onReturn,
}: {
  message: string;
  onReturn: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <Card className="w-full max-w-xl">
        <Card.Header>
          <Card.Title>Something went wrong</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-4">
          <Alert className="border border-danger-300 bg-danger-50">
            <Alert.Content>
              <Alert.Title>Could not complete the folder action</Alert.Title>
              <Alert.Description>{message}</Alert.Description>
            </Alert.Content>
          </Alert>
          <Button variant="primary" onPress={onReturn}>
            Return to start
          </Button>
        </Card.Content>
      </Card>
    </main>
  );
}

function loadingLabel(action: "open" | "new" | "create" | "restore"): string {
  switch (action) {
    case "open":
      return "Opening chapter folder";
    case "new":
      return "Preparing new chapter";
    case "create":
      return "Creating guide.mdx";
    case "restore":
      return "Restoring chapter folder";
  }
}
