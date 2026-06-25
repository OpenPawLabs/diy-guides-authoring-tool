import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useGuideDocument } from "../hooks/useGuideDocument";
import { GUIDE_MDX } from "../lib/fs/constants";
import { getDraft, putDraft } from "../lib/fs/guideStore";
import { hashSource } from "../lib/fs/hash";
import { parseStructuredGuide } from "../lib/mdx/structuredGuide";
import { blankGuideMdx } from "../lib/templates/blankGuideMdx";
import { readyDirectory } from "./fakeFs";

const initialGuide = {
  folderName: "0-overview",
  guideMdxExists: true as const,
  imagesDirExists: true,
  guideMdxLastModified: 1,
  guideMdxSize: 10,
};

function renderDocument(
  guideId: string,
  directory: ReturnType<typeof readyDirectory>,
) {
  return renderHook(() =>
    useGuideDocument({
      guideId,
      directory: directory.asDirectoryHandle(),
      initialGuide,
    }),
  );
}

describe("useGuideDocument refresh safety", () => {
  it("loads from disk and saves edits back", async () => {
    const directory = readyDirectory("# Initial");
    const { result } = renderDocument("g1", directory);

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.isDirty).toBe(false);

    act(() => result.current.setRawSource("# Edited"));
    expect(result.current.isDirty).toBe(true);

    await act(async () => {
      await result.current.save();
    });

    expect(directory.files.get(GUIDE_MDX)?.content).toBe("# Edited");
    expect(result.current.isDirty).toBe(false);
  });

  it("restores a persisted draft when the file is unchanged", async () => {
    const directory = readyDirectory("# Initial");
    await putDraft({
      guideId: "g2",
      mode: "raw",
      rawSource: "# Draft edit",
      baseSource: "# Initial",
      baseHash: await hashSource("# Initial"),
      updatedAt: 1,
    });

    const { result } = renderDocument("g2", directory);

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.hasConflict).toBe(false);
    expect(result.current.isDirty).toBe(true);
    expect(
      result.current.state.status === "ready" && result.current.state.rawSource,
    ).toBe("# Draft edit");
  });

  it("flags a conflict when the file changed under a pending draft", async () => {
    const directory = readyDirectory("# New on disk");
    await putDraft({
      guideId: "g3",
      mode: "raw",
      rawSource: "# Draft edit",
      baseSource: "# Old base",
      baseHash: await hashSource("# Old base"),
      updatedAt: 1,
    });

    const { result } = renderDocument("g3", directory);

    await waitFor(() => expect(result.current.hasConflict).toBe(true));

    act(() => result.current.keepEdits());
    expect(result.current.hasConflict).toBe(false);
    expect(result.current.isDirty).toBe(true);
  });

  it("reloads from disk and clears the draft when resolving a conflict", async () => {
    const directory = readyDirectory("# New on disk");
    await putDraft({
      guideId: "g4",
      mode: "raw",
      rawSource: "# Draft edit",
      baseSource: "# Old base",
      baseHash: await hashSource("# Old base"),
      updatedAt: 1,
    });

    const { result } = renderDocument("g4", directory);

    await waitFor(() => expect(result.current.hasConflict).toBe(true));

    await act(async () => {
      await result.current.reloadFromDisk();
    });

    expect(result.current.hasConflict).toBe(false);
    expect(result.current.isDirty).toBe(false);
    expect(
      result.current.state.status === "ready" && result.current.state.rawSource,
    ).toBe("# New on disk");
    expect(await getDraft("g4")).toBeNull();
  });

  it("switches to preview mode", async () => {
    const directory = readyDirectory(blankGuideMdx);
    const { result } = renderDocument("g-preview-mode", directory);

    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    act(() => result.current.setMode("preview"));
    expect(
      result.current.state.status === "ready" && result.current.state.mode,
    ).toBe("preview");
  });

  it("restores preview mode from a persisted draft", async () => {
    const directory = readyDirectory(blankGuideMdx);
    const parsed = parseStructuredGuide(blankGuideMdx);
    expect(parsed.status).toBe("supported");
    if (parsed.status !== "supported") {
      return;
    }

    await putDraft({
      guideId: "g-preview-restore",
      mode: "preview",
      draft: parsed.draft,
      baseSource: blankGuideMdx,
      baseHash: await hashSource(blankGuideMdx),
      updatedAt: 1,
    });

    const { result } = renderDocument("g-preview-restore", directory);

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(
      result.current.state.status === "ready" && result.current.state.mode,
    ).toBe("preview");
  });

  it("discards edits, reverts to disk, and clears the persisted draft", async () => {
    const directory = readyDirectory("# Initial");
    const { result } = renderDocument("g-discard", directory);

    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    act(() => result.current.setRawSource("# Edited away"));
    expect(result.current.isDirty).toBe(true);
    expect(result.current.getCurrentSource()).toBe("# Edited away");

    await act(async () => {
      await result.current.discardChanges();
    });

    expect(result.current.isDirty).toBe(false);
    expect(
      result.current.state.status === "ready" && result.current.state.rawSource,
    ).toBe("# Initial");
    expect(directory.files.get(GUIDE_MDX)?.content).toBe("# Initial");
    expect(await getDraft("g-discard")).toBeNull();
  });

  it("reports permission loss instead of erroring", async () => {
    const directory = readyDirectory("# Initial");
    vi.spyOn(directory, "queryPermission").mockResolvedValue("denied");
    vi.spyOn(directory, "requestPermission").mockResolvedValue("denied");
    const onPermissionLost = vi.fn();

    renderHook(() =>
      useGuideDocument({
        guideId: "g5",
        directory: directory.asDirectoryHandle(),
        initialGuide,
        onPermissionLost,
      }),
    );

    await waitFor(() => expect(onPermissionLost).toHaveBeenCalledWith("0-overview"));
  });
});
