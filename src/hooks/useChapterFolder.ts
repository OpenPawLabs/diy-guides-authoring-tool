import { useCallback, useEffect, useState } from "react";
import {
  createBlankChapter,
  loadChapterFolder,
} from "../lib/fs/chapterFiles";
import {
  clearStoredChapterHandle,
  getStoredChapterHandle,
  saveChapterHandle,
} from "../lib/fs/handleStore";
import { hasReadWritePermission, isPermissionLostError } from "../lib/fs/permissions";
import { pickChapterFolder } from "../lib/fs/pickFolder";
import type { ChapterStatus } from "../lib/fs/types";
import {
  PermissionLostError,
  UserCancelledFolderPickError,
} from "../lib/fs/types";

type ChapterState =
  | { status: "restoring" }
  | { status: "idle"; permissionLostFolderName?: string }
  | { status: "loading"; action: "open" | "new" | "create" | "restore" }
  | {
      status: "ready";
      handle: FileSystemDirectoryHandle;
      chapter: ChapterStatus & { guideMdxExists: true };
      notice?: string;
    }
  | {
      status: "missing-guide";
      handle: FileSystemDirectoryHandle;
      chapter: ChapterStatus & { guideMdxExists: false };
    }
  | {
      status: "already-exists";
      handle: FileSystemDirectoryHandle;
      chapter: ChapterStatus & { guideMdxExists: true };
    }
  | { status: "permission-lost"; folderName?: string }
  | { status: "error"; message: string };

export function useChapterFolder() {
  const [state, setState] = useState<ChapterState>({ status: "restoring" });

  const setLoadedState = useCallback(
    (
      handle: FileSystemDirectoryHandle,
      result: Awaited<ReturnType<typeof loadChapterFolder>>,
    ) => {
      if (result.kind === "ready") {
        setState({ status: "ready", handle, chapter: result.status });
        return;
      }

      setState({ status: "missing-guide", handle, chapter: result.status });
    },
    [],
  );

  const handleError = useCallback((error: unknown, folderName?: string) => {
    if (error instanceof UserCancelledFolderPickError) {
      setState((current) =>
        current.status === "loading" ? { status: "idle" } : current,
      );
      return;
    }

    if (isPermissionLostError(error)) {
      setState({ status: "permission-lost", folderName });
      return;
    }

    setState({
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Something went wrong while opening the folder.",
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreHandle() {
      try {
        const stored = await getStoredChapterHandle();
        if (cancelled) {
          return;
        }

        if (!stored) {
          setState({ status: "idle" });
          return;
        }

        if (!(await hasReadWritePermission(stored.handle))) {
          setState({
            status: "idle",
            permissionLostFolderName: stored.name,
          });
          return;
        }

        setState({ status: "loading", action: "restore" });
        const result = await loadChapterFolder(stored.handle);
        if (!cancelled) {
          setLoadedState(stored.handle, result);
        }
      } catch (error) {
        if (!cancelled) {
          handleError(error, undefined);
        }
      }
    }

    restoreHandle();

    return () => {
      cancelled = true;
    };
  }, [handleError, setLoadedState]);

  const openChapterFolder = useCallback(async () => {
    setState({ status: "loading", action: "open" });

    try {
      const handle = await pickChapterFolder();
      const result = await loadChapterFolder(handle);
      await saveChapterHandle(handle);
      setLoadedState(handle, result);
    } catch (error) {
      handleError(error);
    }
  }, [handleError, setLoadedState]);

  const startNewChapter = useCallback(async () => {
    setState({ status: "loading", action: "new" });

    try {
      const handle = await pickChapterFolder();
      const result = await createBlankChapter(handle);
      await saveChapterHandle(handle);

      if (result.kind === "already-exists") {
        setState({ status: "already-exists", handle, chapter: result.status });
        return;
      }

      setState({
        status: "ready",
        handle,
        chapter: result.status,
        notice: "Created guide.mdx and images/ in the selected folder.",
      });
    } catch (error) {
      handleError(error);
    }
  }, [handleError]);

  const createGuideInCurrentFolder = useCallback(async () => {
    if (state.status !== "missing-guide") {
      return;
    }

    const { handle } = state;
    setState({ status: "loading", action: "create" });

    try {
      const result = await createBlankChapter(handle);
      await saveChapterHandle(handle);

      if (result.kind === "already-exists") {
        setState({ status: "already-exists", handle, chapter: result.status });
        return;
      }

      setState({
        status: "ready",
        handle,
        chapter: result.status,
        notice: "Created guide.mdx and images/ in the selected folder.",
      });
    } catch (error) {
      handleError(error, handle.name);
    }
  }, [handleError, state]);

  const useExistingGuide = useCallback(async () => {
    if (state.status !== "already-exists") {
      return;
    }

    setState({
      status: "ready",
      handle: state.handle,
      chapter: state.chapter,
      notice: "Opened the existing guide.mdx without overwriting it.",
    });
  }, [state]);

  const closeChapter = useCallback(async () => {
    await clearStoredChapterHandle();
    setState({ status: "idle" });
  }, []);

  const clearError = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  const markPermissionLost = useCallback(
    (folderName?: string) => handleError(new PermissionLostError(), folderName),
    [handleError],
  );

  return {
    state,
    openChapterFolder,
    startNewChapter,
    createGuideInCurrentFolder,
    useExistingGuide,
    closeChapter,
    clearError,
    markPermissionLost,
  };
}
