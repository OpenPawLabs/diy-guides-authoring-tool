import { Alert, Button, Card, Spinner } from "@heroui/react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { FolderAccessModal } from "../components/FolderAccessModal";
import { GuideStatusCard } from "../components/GuideStatusCard";
import { useGuideFolder } from "../hooks/useGuideFolder";
import { GuideEditor } from "./GuideEditor";

export function GuideEditorRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, requestAccess, createGuide, markPermissionLost, retry } =
    useGuideFolder(id);

  const goHome = () => navigate("/");

  if (state.status === "not-found") {
    return <Navigate replace to="/" />;
  }

  if (state.status === "loading") {
    return <CenteredCard label="Opening guide" />;
  }

  if (state.status === "error") {
    return (
      <Shell heading="Guide editor" onClose={goHome}>
        <Alert className="border border-danger-300 bg-danger-50">
          <Alert.Content>
            <Alert.Title>Could not open this guide</Alert.Title>
            <Alert.Description>{state.message}</Alert.Description>
            <div className="mt-4">
              <Button variant="primary" onPress={() => void retry()}>
                Try again
              </Button>
            </div>
          </Alert.Content>
        </Alert>
      </Shell>
    );
  }

  if (state.status === "needs-permission") {
    return (
      <>
        <CenteredCard label="Waiting for folder access" />
        <FolderAccessModal
          isOpen
          folderName={state.guide.folderName}
          onAllowAccess={() => void requestAccess()}
          onCancel={goHome}
        />
      </>
    );
  }

  if (state.status === "missing-guide") {
    return (
      <Shell heading={state.guide.folderName} onClose={goHome}>
        <Alert className="border border-warning-300 bg-warning-50">
          <Alert.Content>
            <Alert.Title>guide.mdx is missing</Alert.Title>
            <Alert.Description>
              This folder can be initialized as a guide. The tool will create a
              blank guide.mdx template and an images/ directory.
            </Alert.Description>
            <div className="mt-4">
              <Button variant="secondary" onPress={() => void createGuide()}>
                Create guide.mdx from template
              </Button>
            </div>
          </Alert.Content>
        </Alert>
        <GuideStatusCard guide={state.folder} />
      </Shell>
    );
  }

  return (
    <GuideEditor
      guideId={state.guide.id}
      directory={state.guide.handle}
      guide={state.folder}
      initialStep={state.guide.lastStep}
      notice={state.notice}
      onClose={goHome}
      onPermissionLost={markPermissionLost}
    />
  );
}

function CenteredCard({ label }: { label: string }) {
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

function Shell({
  heading,
  onClose,
  children,
}: {
  heading: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Guide folder
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-default-950">
            {heading}
          </h1>
        </div>
        <Button variant="outline" onPress={onClose}>
          Back to guides
        </Button>
      </header>
      {children}
    </main>
  );
}
