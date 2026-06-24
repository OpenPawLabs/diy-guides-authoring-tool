import { useCallback, useEffect, useMemo, useState } from "react";
import { readGuideMdx, writeGuideMdx } from "../lib/fs/chapterFiles";
import { isPermissionLostError } from "../lib/fs/permissions";
import {
  parseStructuredGuide,
  updateStructuredGuideSource,
  type GuideDraft,
} from "../lib/mdx/structuredGuide";
import type { ChapterStatus } from "../lib/fs/types";

type Chapter = ChapterStatus & { guideMdxExists: true };

export type EditorMode = "structured" | "raw";

interface UseGuideDocumentOptions {
  directory: FileSystemDirectoryHandle;
  initialChapter: Chapter;
  onPermissionLost?: (folderName?: string) => void;
}

/**
 * Document state. While editing, the structured `draft` is the source of truth in
 * structured mode and `rawSource` is authoritative in raw mode. MDX is only
 * (re)serialized on save and when switching modes — never per keystroke.
 */
type GuideDocumentState =
  | { status: "loading"; chapter: Chapter }
  | { status: "error"; chapter: Chapter; message: string }
  | {
      status: "ready";
      chapter: Chapter;
      mode: EditorMode;
      /** Present whenever the document matches the structured shape. */
      draft?: GuideDraft;
      /** Full MDX whose non-owned regions are preserved when serializing the draft. */
      baseSource: string;
      /** Authoritative source in raw mode; mirrors the saved/serialized MDX otherwise. */
      rawSource: string;
      warnings: string[];
      /** Why structured editing is unavailable (kept document in raw mode). */
      structuredError?: string;
      isDirty: boolean;
      isSaving: boolean;
      saveError?: string;
    };

type ReadyState = Extract<GuideDocumentState, { status: "ready" }>;

function readyFromSource(chapter: Chapter, source: string): ReadyState {
  const parsed = parseStructuredGuide(source);

  if (parsed.status === "supported") {
    return {
      status: "ready",
      chapter,
      mode: "structured",
      draft: parsed.draft,
      baseSource: source,
      rawSource: source,
      warnings: parsed.warnings,
      isDirty: false,
      isSaving: false,
    };
  }

  return {
    status: "ready",
    chapter,
    mode: "raw",
    baseSource: source,
    rawSource: source,
    warnings: [],
    structuredError: parsed.reason,
    isDirty: false,
    isSaving: false,
  };
}

/** Serialize the current editing state back to MDX (only called on save / mode switch). */
function currentSourceOf(state: ReadyState): string {
  if (state.mode === "structured" && state.draft) {
    return updateStructuredGuideSource(state.baseSource, state.draft);
  }
  return state.rawSource;
}

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
      setState(readyFromSource(initialChapter, source));
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

  const isDirty = state.status === "ready" && state.isDirty;

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

  const updateDraft = useCallback((mutate: (draft: GuideDraft) => void) => {
    setState((current) => {
      if (current.status !== "ready" || !current.draft) {
        return current;
      }

      const draft = structuredClone(current.draft);
      mutate(draft);
      return { ...current, draft, isDirty: true, saveError: undefined };
    });
  }, []);

  const setRawSource = useCallback((rawSource: string) => {
    setState((current) =>
      current.status === "ready"
        ? { ...current, rawSource, isDirty: true, saveError: undefined }
        : current,
    );
  }, []);

  const setMode = useCallback((mode: EditorMode) => {
    setState((current) => {
      if (current.status !== "ready" || current.mode === mode) {
        return current;
      }

      if (mode === "raw") {
        return { ...current, mode: "raw", rawSource: currentSourceOf(current) };
      }

      const parsed = parseStructuredGuide(current.rawSource);
      if (parsed.status !== "supported") {
        return { ...current, structuredError: parsed.reason };
      }

      return {
        ...current,
        mode: "structured",
        draft: parsed.draft,
        baseSource: current.rawSource,
        warnings: parsed.warnings,
        structuredError: undefined,
      };
    });
  }, []);

  const save = useCallback(async () => {
    if (state.status !== "ready" || state.isSaving) {
      return;
    }

    const source = currentSourceOf(state);
    setState({ ...state, isSaving: true, saveError: undefined });

    try {
      const chapter = await writeGuideMdx(directory, source);
      setState((current) =>
        current.status === "ready"
          ? {
              ...current,
              chapter,
              rawSource: source,
              isDirty: false,
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
    () => ({ state, isDirty, load, save, updateDraft, setRawSource, setMode }),
    [isDirty, load, save, setMode, setRawSource, state, updateDraft],
  );
}
