import { useCallback, useEffect, useState } from "react";
import { createBlankGuide, loadGuideFolder } from "../lib/fs/guideFiles";
import { getGuide, putGuide, type StoredGuide } from "../lib/fs/guideStore";
import {
  hasReadWritePermission,
  isPermissionLostError,
  requestReadWritePermission,
} from "../lib/fs/permissions";
import type { GuideFolderStatus } from "../lib/fs/types";

type LoadedGuide = GuideFolderStatus & { guideMdxExists: true };

type GuideFolderState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "needs-permission"; guide: StoredGuide }
  | { status: "missing-guide"; guide: StoredGuide; folder: GuideFolderStatus }
  | { status: "ready"; guide: StoredGuide; folder: LoadedGuide; notice?: string }
  | { status: "error"; message: string };

/**
 * Resolves the `/guide/:id` route: looks the guide up in the recents store,
 * re-prompts for folder access when Chrome dropped it, then loads the folder
 * (offering to create `guide.mdx` when it is missing).
 */
export function useGuideFolder(id: string | undefined) {
  const [state, setState] = useState<GuideFolderState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  const loadFolder = useCallback(async (guide: StoredGuide, notice?: string) => {
    try {
      const result = await loadGuideFolder(guide.handle);
      setState(
        result.kind === "ready"
          ? { status: "ready", guide, folder: result.status, notice }
          : { status: "missing-guide", guide, folder: result.status },
      );
    } catch (error) {
      if (isPermissionLostError(error)) {
        setState({ status: "needs-permission", guide });
        return;
      }

      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not open this guide folder.",
      });
    }
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      const guide = await getGuide(id ?? "");
      if (!active) {
        return;
      }
      if (!guide) {
        setState({ status: "not-found" });
        return;
      }
      if (!(await hasReadWritePermission(guide.handle))) {
        if (active) {
          setState({ status: "needs-permission", guide });
        }
        return;
      }
      if (active) {
        await loadFolder(guide);
      }
    })();

    return () => {
      active = false;
    };
  }, [attempt, id, loadFolder]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }, []);

  const requestAccess = useCallback(async () => {
    if (state.status !== "needs-permission") {
      return;
    }

    if (!(await requestReadWritePermission(state.guide.handle))) {
      return;
    }

    setState({ status: "loading" });
    await loadFolder(state.guide);
  }, [loadFolder, state]);

  const createGuide = useCallback(async () => {
    if (state.status !== "missing-guide") {
      return;
    }

    const { guide } = state;
    setState({ status: "loading" });
    try {
      await createBlankGuide(guide.handle);
      await putGuide({ ...guide, lastOpenedAt: Date.now() });
      await loadFolder(
        guide,
        "Created guide.mdx and images/ in the selected folder.",
      );
    } catch (error) {
      if (isPermissionLostError(error)) {
        setState({ status: "needs-permission", guide });
        return;
      }

      setState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Could not create guide.mdx.",
      });
    }
  }, [loadFolder, state]);

  const markPermissionLost = useCallback(() => {
    setState((current) =>
      "guide" in current
        ? { status: "needs-permission", guide: current.guide }
        : current,
    );
  }, []);

  return { state, requestAccess, createGuide, markPermissionLost, retry };
}
