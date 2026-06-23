import { Alert, Card, Spinner } from "@heroui/react";
import {
  Callout,
  GuideLayout,
  GuideStep,
  GuideStepList,
  MediaFigure,
  ToolList,
  type MediaFigureProps,
} from "@openpawlabs/diy-guides-ui";
import { useEffect, useMemo, useState } from "react";
import { IMAGES_DIR } from "../lib/fs/constants";
import {
  compileGuideMdx,
  formatMdxError,
  type GuideMdxComponent,
} from "../lib/mdx/guideMdx";

const PREVIEW_DEBOUNCE_MS = 250;
const MISSING_IMAGE_SRC = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#f1f5f9"/>
  <rect x="80" y="80" width="640" height="440" rx="24" fill="none" stroke="#94a3b8" stroke-width="8" stroke-dasharray="24 20"/>
  <text x="400" y="292" text-anchor="middle" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#475569">Missing image</text>
  <text x="400" y="344" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#64748b">Add this file under images/</text>
</svg>
`)}`;

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
    return <MediaFigure {...props} src={resolvedSrc} />;
  }

  return {
    Callout,
    GuideLayout,
    GuideStep,
    GuideStepList,
    MediaFigure: PreviewMediaFigure,
    ToolList,
  };
}

function useResolvedImageSrc(
  directory: FileSystemDirectoryHandle,
  src: string,
): string {
  const imagePath = imageAssetPath(src);
  const [resolvedAsset, setResolvedAsset] = useState<{
    directory: FileSystemDirectoryHandle;
    path: string;
    src: string;
  } | null>(null);

  useEffect(() => {
    if (!imagePath) {
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    resolveImageAsset(directory, imagePath)
      .then((file) => {
        objectUrl = URL.createObjectURL(file);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }

        setResolvedAsset({ directory, path: imagePath, src: objectUrl });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [directory, imagePath]);

  if (!imagePath) {
    return src;
  }

  return resolvedAsset?.directory === directory && resolvedAsset.path === imagePath
    ? resolvedAsset.src
    : MISSING_IMAGE_SRC;
}

function imageAssetPath(src: string): string | null {
  const normalized = src.replaceAll("\\", "/").replace(/^\.?\//, "");
  const prefix = `${IMAGES_DIR}/`;

  if (!normalized.startsWith(prefix)) {
    return null;
  }

  return normalized.slice(prefix.length);
}

async function resolveImageAsset(
  directory: FileSystemDirectoryHandle,
  imagePath: string,
): Promise<File> {
  const parts = imagePath.split("/").filter(Boolean);
  let current = await directory.getDirectoryHandle(IMAGES_DIR);

  for (const part of parts.slice(0, -1)) {
    current = await current.getDirectoryHandle(part);
  }

  const fileName = parts.at(-1);
  if (!fileName) {
    throw new Error("Image path is empty.");
  }

  return await (await current.getFileHandle(fileName)).getFile();
}
