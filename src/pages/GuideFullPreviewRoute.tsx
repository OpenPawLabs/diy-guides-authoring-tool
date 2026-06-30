import { Alert, Button, Spinner } from "@heroui/react";
import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { FolderAccessModal } from "../components/FolderAccessModal";
import { GuidePreview } from "../components/GuidePreview";
import { useGuideFolder } from "../hooks/useGuideFolder";
import { readGuideMdx } from "../lib/fs/guideFiles";
import { isPermissionLostError } from "../lib/fs/permissions";

export function GuideFullPreviewRoute() {
  const { id } = useParams();
  const { state, requestAccess, markPermissionLost, retry } = useGuideFolder(id);
  const [savedSource, setSavedSource] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (state.status !== "ready") {
      return;
    }

    let active = true;

    void (async () => {
      try {
        const source = await readGuideMdx(state.guide.handle);
        if (!active) {
          return;
        }
        setSavedSource(source);
        setLoadError(null);
      } catch (error) {
        if (!active) {
          return;
        }
        if (isPermissionLostError(error)) {
          markPermissionLost();
          return;
        }
        setSavedSource(null);
        setLoadError(
          error instanceof Error
            ? error.message
            : "Could not read guide.mdx from disk.",
        );
      }
    })();

    return () => {
      active = false;
    };
  }, [markPermissionLost, state]);

  if (state.status === "not-found") {
    return <Navigate replace to="/" />;
  }

  if (state.status === "needs-permission") {
    return (
      <>
        <PreviewShell>
          <p className="text-default-600">Waiting for folder access…</p>
        </PreviewShell>
        <FolderAccessModal
          isOpen
          folderName={state.guide.folderName}
          onAllowAccess={() => void requestAccess()}
          onCancel={() => window.close()}
        />
      </>
    );
  }

  if (state.status === "loading") {
    return (
      <PreviewShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Spinner />
        </div>
      </PreviewShell>
    );
  }

  if (state.status === "error") {
    return (
      <PreviewShell>
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
      </PreviewShell>
    );
  }

  if (state.status === "missing-guide") {
    return (
      <PreviewShell>
        <Alert className="border border-warning-300 bg-warning-50">
          <Alert.Content>
            <Alert.Title>guide.mdx is missing</Alert.Title>
            <Alert.Description>
              There is nothing saved to preview yet.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      </PreviewShell>
    );
  }

  return (
    <PreviewShell>
      {loadError && (
        <Alert className="mb-3 border border-danger-300 bg-danger-50">
          <Alert.Content>
            <Alert.Title>Could not load guide.mdx</Alert.Title>
            <Alert.Description>{loadError}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {savedSource != null && (
        <GuidePreview bare directory={state.guide.handle} source={savedSource} />
      )}
    </PreviewShell>
  );
}

function PreviewShell({ children }: { children: React.ReactNode }) {
  return <div className="m-[3%]">{children}</div>;
}
