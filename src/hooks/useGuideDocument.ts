import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readGuideMdx, writeGuideMdx } from "../lib/fs/guideFiles";
import { hashSource } from "../lib/fs/hash";
import {
  clearDraft,
  getDraft,
  putDraft,
  updateGuide,
  type StoredDraft,
} from "../lib/fs/guideStore";
import { isPermissionLostError } from "../lib/fs/permissions";
import {
  parseStructuredGuide,
  updateStructuredGuideSource,
  type GuideDifficulty,
  type GuideDraft,
} from "../lib/mdx/structuredGuide";
import type { GuideFolderStatus } from "../lib/fs/types";

type LoadedGuide = GuideFolderStatus & { guideMdxExists: true };

export type EditorMode = "structured" | "raw";

interface UseGuideDocumentOptions {
  guideId: string;
  directory: FileSystemDirectoryHandle;
  initialGuide: LoadedGuide;
  onPermissionLost?: (folderName?: string) => void;
}

interface DiskConflict {
  diskSource: string;
  diskHash: string;
}

/**
 * Document state. While editing, the structured `draft` is the source of truth in
 * structured mode and `rawSource` is authoritative in raw mode. MDX is only
 * (re)serialized on save and when switching modes — never per keystroke. Unsaved
 * edits are mirrored to IndexedDB so a refresh or permission loss cannot drop
 * them, and `loadedHash` anchors the on-disk content the session is based on so a
 * file changed underneath the editor surfaces as a `conflict` choice.
 */
type GuideDocumentState =
  | { status: "loading"; guide: LoadedGuide }
  | { status: "error"; guide: LoadedGuide; message: string }
  | {
      status: "ready";
      guide: LoadedGuide;
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
      /** Hash of the on-disk file this edit session is anchored to. */
      loadedHash: string;
      isDirty: boolean;
      isSaving: boolean;
      saveError?: string;
      /** Set when the file on disk diverged from `loadedHash` while edits are pending. */
      conflict?: DiskConflict;
    };

type ReadyState = Extract<GuideDocumentState, { status: "ready" }>;

function readyFromSource(
  guide: LoadedGuide,
  source: string,
  loadedHash: string,
): ReadyState {
  const parsed = parseStructuredGuide(source);

  if (parsed.status === "supported") {
    return {
      status: "ready",
      guide,
      mode: "structured",
      draft: parsed.draft,
      baseSource: source,
      rawSource: source,
      warnings: parsed.warnings,
      loadedHash,
      isDirty: false,
      isSaving: false,
    };
  }

  return {
    status: "ready",
    guide,
    mode: "raw",
    baseSource: source,
    rawSource: source,
    warnings: [],
    structuredError: parsed.reason,
    loadedHash,
    isDirty: false,
    isSaving: false,
  };
}

function readyFromDraft(
  guide: LoadedGuide,
  stored: StoredDraft,
  loadedHash: string,
  conflict?: DiskConflict,
): ReadyState {
  const rawSource = stored.rawSource ?? stored.baseSource;
  let structuredError: string | undefined;
  if (stored.mode === "raw" && !stored.draft) {
    const parsed = parseStructuredGuide(rawSource);
    structuredError = parsed.status === "supported" ? undefined : parsed.reason;
  }

  return {
    status: "ready",
    guide,
    mode: stored.mode,
    draft: stored.draft,
    baseSource: stored.baseSource,
    rawSource,
    warnings: [],
    structuredError,
    loadedHash,
    isDirty: true,
    isSaving: false,
    conflict,
  };
}

/** Serialize the current editing state back to MDX (only called on save / mode switch). */
function currentSourceOf(state: ReadyState): string {
  if (state.mode === "structured" && state.draft) {
    return updateStructuredGuideSource(state.baseSource, state.draft);
  }
  return state.rawSource;
}

/** Card metadata derived from a guide source, when it matches the structured shape. */
function metaFromSource(source: string): {
  title?: string;
  difficulty?: GuideDifficulty;
} {
  const parsed = parseStructuredGuide(source);
  if (parsed.status !== "supported") {
    return {};
  }

  return {
    title: parsed.draft.header.title || undefined,
    difficulty: parsed.draft.header.difficulty,
  };
}

function toStoredDraft(guideId: string, state: ReadyState): StoredDraft {
  return {
    guideId,
    mode: state.mode,
    draft: state.draft,
    rawSource: state.rawSource,
    baseSource: state.baseSource,
    baseHash: state.loadedHash,
    updatedAt: Date.now(),
  };
}

export function useGuideDocument({
  guideId,
  directory,
  initialGuide,
  onPermissionLost,
}: UseGuideDocumentOptions) {
  const [state, setState] = useState<GuideDocumentState>({
    status: "loading",
    guide: initialGuide,
  });

  /** Latest unsaved draft, flushed on unmount so route changes never drop edits. */
  const pendingDraft = useRef<StoredDraft | null>(null);

  const load = useCallback(async () => {
    setState({ status: "loading", guide: initialGuide });

    try {
      const source = await readGuideMdx(directory);
      const diskHash = await hashSource(source);
      const stored = await getDraft(guideId);

      if (stored) {
        const conflict =
          stored.baseHash === diskHash ? undefined : { diskSource: source, diskHash };
        setState(readyFromDraft(initialGuide, stored, stored.baseHash, conflict));
        return;
      }

      setState(readyFromSource(initialGuide, source, diskHash));
      await updateGuide(guideId, {
        lastOpenedAt: Date.now(),
        lastLoadedHash: diskHash,
        ...metaFromSource(source),
      });
    } catch (error) {
      if (isPermissionLostError(error)) {
        onPermissionLost?.(directory.name);
        return;
      }

      setState({
        status: "error",
        guide: initialGuide,
        message:
          error instanceof Error
            ? error.message
            : "Could not load guide.mdx from this folder.",
      });
    }
  }, [directory, guideId, initialGuide, onPermissionLost]);

  useEffect(() => {
    void load();
  }, [load]);

  const isDirty = state.status === "ready" && state.isDirty;
  const hasConflict = state.status === "ready" && state.conflict != null;

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

  // Mirror pending edits to IndexedDB (debounced) so a refresh restores them.
  useEffect(() => {
    if (state.status !== "ready" || !state.isDirty || state.conflict) {
      return;
    }

    const draft = toStoredDraft(guideId, state);
    pendingDraft.current = draft;
    const timer = setTimeout(() => void putDraft(draft), 400);
    return () => clearTimeout(timer);
  }, [guideId, state]);

  useEffect(
    () => () => {
      if (pendingDraft.current) {
        void putDraft(pendingDraft.current);
      }
    },
    [],
  );

  // Detect a `guide.mdx` changed by another tool while edits are pending.
  useEffect(() => {
    if (state.status !== "ready" || !state.isDirty || state.conflict) {
      return;
    }

    const { loadedHash } = state;
    const recheck = async () => {
      try {
        const source = await readGuideMdx(directory);
        const diskHash = await hashSource(source);
        if (diskHash === loadedHash) {
          return;
        }

        setState((current) =>
          current.status === "ready" && current.isDirty && !current.conflict
            ? { ...current, conflict: { diskSource: source, diskHash } }
            : current,
        );
      } catch (error) {
        if (isPermissionLostError(error)) {
          onPermissionLost?.(directory.name);
        }
      }
    };

    const onFocus = () => void recheck();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [directory, onPermissionLost, state]);

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
      const guide = await writeGuideMdx(directory, source);
      const savedHash = await hashSource(source);
      await clearDraft(guideId);
      pendingDraft.current = null;
      await updateGuide(guideId, {
        lastSavedAt: Date.now(),
        lastLoadedHash: savedHash,
        ...metaFromSource(source),
      });

      setState((current) =>
        current.status === "ready"
          ? {
              ...current,
              guide,
              rawSource: source,
              loadedHash: savedHash,
              isDirty: false,
              isSaving: false,
              conflict: undefined,
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
  }, [directory, guideId, onPermissionLost, state]);

  /** Serialize the current editing state to MDX (for diffing before a discard). */
  const getCurrentSource = useCallback(
    () => (state.status === "ready" ? currentSourceOf(state) : ""),
    [state],
  );

  /** Drop all unsaved edits and revert the editor to the on-disk `guide.mdx`. */
  const discardChanges = useCallback(async () => {
    if (state.status !== "ready" || !state.isDirty) {
      return;
    }

    await clearDraft(guideId);
    pendingDraft.current = null;
    setState((current) =>
      current.status === "ready"
        ? readyFromSource(current.guide, current.baseSource, current.loadedHash)
        : current,
    );
  }, [guideId, state]);

  /** Resolve a disk conflict by keeping in-memory edits (disk version is overridden on next save). */
  const keepEdits = useCallback(() => {
    setState((current) =>
      current.status === "ready" && current.conflict
        ? { ...current, loadedHash: current.conflict.diskHash, conflict: undefined }
        : current,
    );
  }, []);

  /** Resolve a disk conflict by discarding edits and reloading the newer file. */
  const reloadFromDisk = useCallback(async () => {
    if (state.status !== "ready" || !state.conflict) {
      return;
    }

    const { diskSource, diskHash } = state.conflict;
    await clearDraft(guideId);
    pendingDraft.current = null;
    await updateGuide(guideId, {
      lastOpenedAt: Date.now(),
      lastLoadedHash: diskHash,
      ...metaFromSource(diskSource),
    });

    setState((current) =>
      current.status === "ready"
        ? readyFromSource(current.guide, diskSource, diskHash)
        : current,
    );
  }, [guideId, state]);

  return useMemo(
    () => ({
      state,
      isDirty,
      hasConflict,
      load,
      save,
      updateDraft,
      setRawSource,
      setMode,
      keepEdits,
      reloadFromDisk,
      discardChanges,
      getCurrentSource,
    }),
    [
      discardChanges,
      getCurrentSource,
      hasConflict,
      isDirty,
      keepEdits,
      load,
      reloadFromDisk,
      save,
      setMode,
      setRawSource,
      state,
      updateDraft,
    ],
  );
}
