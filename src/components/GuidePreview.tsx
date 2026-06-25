import { Alert, Card, Spinner } from "@heroui/react";
import {
  Callout,
  GuideLayout,
  GuideStep,
  GuideStepList,
  LinkButton,
  MediaFigure,
  ToolList,
  type MediaFigureProps,
} from "@openpawlabs/diy-guides-ui";
import { useEffect, useMemo, useState } from "react";
import { useResolvedImageSrc, assetBaseName } from "../hooks/useResolvedImageSrc";
import {
  compileGuideMdx,
  formatMdxError,
  type GuideMdxComponent,
} from "../lib/mdx/guideMdx";

const PREVIEW_DEBOUNCE_MS = 250;

interface GuidePreviewProps {
  source: string;
  directory: FileSystemDirectoryHandle;
}

type PreviewState =
  | { status: "compiling" }
  | { status: "ready"; Content: GuideMdxComponent }
  | { status: "error"; message: string };

export function GuidePreview({ source, directory }: GuidePreviewProps) {
  const [state, setState] = useState<PreviewState>({ status: "compiling" });
  const components = useMemo(() => createPreviewComponents(directory), [directory]);

  useEffect(() => {
    let cancelled = false;

    const timeout = window.setTimeout(async () => {
      setState({ status: "compiling" });

      try {
        const compiled = await compileGuideMdx(source);
        if (!cancelled) {
          setState({ status: "ready", Content: compiled.Content });
        }
      } catch (error) {
        if (!cancelled) {
          setState({ status: "error", message: formatMdxError(error) });
        }
      }
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [source]);

  if (state.status === "compiling") {
    return (
      <Card className="min-h-80">
        <Card.Content className="flex min-h-80 items-center justify-center gap-3 text-default-600">
          <Spinner size="sm" />
          <span>Updating preview</span>
        </Card.Content>
      </Card>
    );
  }

  if (state.status === "error") {
    return (
      <Alert className="border border-danger-300 bg-danger-50">
        <Alert.Content>
          <Alert.Title>MDX preview error</Alert.Title>
          <Alert.Description>{state.message}</Alert.Description>
        </Alert.Content>
      </Alert>
    );
  }

  const Content = state.Content;

  return (
    <div className="rounded-xl border border-default-200 bg-white p-4 shadow-sm">
      <Content components={components} />
    </div>
  );
}

function createPreviewComponents(directory: FileSystemDirectoryHandle) {
  function PreviewMediaFigure(props: MediaFigureProps) {
    const resolvedSrc = useResolvedImageSrc(directory, props.src);
    const modelFileName =
      props.type === "model" ? assetBaseName(props.src) : undefined;
    return (
      <MediaFigure {...props} src={resolvedSrc} modelFileName={modelFileName} />
    );
  }

  return {
    Callout,
    GuideLayout,
    GuideStep,
    GuideStepList,
    LinkButton,
    MediaFigure: PreviewMediaFigure,
    ToolList,
  };
}
