import { useCallback, useEffect, useMemo, useState } from "react";
import {
  readGuideMdx,
  writeGuideMdx,
} from "../lib/fs/chapterFiles";
import { isPermissionLostError } from "../lib/fs/permissions";
import type { ChapterStatus } from "../lib/fs/types";

interface UseGuideDocumentOptions {
  directory: FileSystemDirectoryHandle;
  initialChapter: ChapterStatus & { guideMdxExists: true };
  onPermissionLost?: (folderName?: string) => void;
}

type GuideDocumentState =
  | { status: "loading"; chapter: ChapterStatus & { guideMdxExists: true } }
  | {
      status: "ready";
      chapter: ChapterStatus & { guideMdxExists: true };
      source: string;
      savedSource: string;
      saveError?: string;
      isSaving: boolean;
    }
  | {
      status: "error";
      chapter: ChapterStatus & { guideMdxExists: true };
      message: string;
    };

export function useGuideDocument({
  directory,
  initialChapter,
  onPermissionLost,
}: UseGuideDocumentOptions) {
  const [state, setState] = useState<GuideDocumentState>({
    status: "loading",
    chapter: initialChapter,
  });

  const load = useCallback(async () => {
    setState({ status: "loading", chapter: initialChapter });

    try {
      const source = await readGuideMdx(directory);
      setState({
        status: "ready",
        chapter: initialChapter,
        source,
        savedSource: source,
        isSaving: false,
      });
    } catch (error) {
      if (isPermissionLostError(error)) {
        onPermissionLost?.(directory.name);
        return;
      }

      setState({
        status: "error",
        chapter: initialChapter,
        message:
          error instanceof Error
            ? error.message
            : "Could not load guide.mdx from this folder.",
      });
    }
  }, [directory, initialChapter, onPermissionLost]);

  useEffect(() => {
    void load();
  }, [load]);

  const isDirty = state.status === "ready" && state.source !== state.savedSource;

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isDirty]);

  const setSource = useCallback((source: string) => {
    setState((current) =>
      current.status === "ready" ? { ...current, source, saveError: undefined } : current,
    );
  }, []);

  const save = useCallback(async () => {
    if (state.status !== "ready" || state.isSaving) {
      return;
    }

    const sourceToSave = state.source;
    setState({ ...state, isSaving: true, saveError: undefined });

    try {
      const chapter = await writeGuideMdx(directory, sourceToSave);
      setState((current) =>
        current.status === "ready"
          ? {
              status: "ready",
              chapter,
              source: current.source,
              savedSource: sourceToSave,
              isSaving: false,
            }
          : current,
      );
    } catch (error) {
      if (isPermissionLostError(error)) {
        onPermissionLost?.(directory.name);
        return;
      }

      setState((current) =>
        current.status === "ready"
          ? {
              ...current,
              isSaving: false,
              saveError:
                error instanceof Error
                  ? error.message
                  : "Could not save guide.mdx to this folder.",
            }
          : current,
      );
    }
  }, [directory, onPermissionLost, state]);

  return useMemo(
    () => ({
      state,
      isDirty,
      load,
      save,
      setSource,
    }),
    [isDirty, load, save, setSource, state],
  );
}
