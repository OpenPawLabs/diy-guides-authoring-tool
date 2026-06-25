import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGuideLibrary } from "../hooks/useGuideLibrary";
import { putDraft } from "../lib/fs/guideStore";
import { pickGuideFolder } from "../lib/fs/pickFolder";
import { UserCancelledFolderPickError } from "../lib/fs/types";
import { resetIndexedDb } from "./resetIndexedDb";

vi.mock("../lib/fs/pickFolder", () => ({ pickGuideFolder: vi.fn() }));
const mockPick = vi.mocked(pickGuideFolder);

class FakeHandle {
  constructor(
    readonly name: string,
    readonly key: string = name,
  ) {}

  async isSameEntry(other: { key?: string }): Promise<boolean> {
    return other?.key === this.key;
  }
}

function handle(name: string, key?: string): FileSystemDirectoryHandle {
  return new FakeHandle(name, key) as unknown as FileSystemDirectoryHandle;
}

beforeEach(async () => {
  mockPick.mockReset();
  await resetIndexedDb();
});

describe("useGuideLibrary", () => {
  it("starts empty once recents have loaded", async () => {
    const { result } = renderHook(() => useGuideLibrary());

    await waitFor(() => expect(result.current.guides).toEqual([]));
  });

  it("adds an opened folder to recents", async () => {
    mockPick.mockResolvedValue(handle("0-overview", "key-1"));
    const { result } = renderHook(() => useGuideLibrary());
    await waitFor(() => expect(result.current.guides).toEqual([]));

    let openedId: string | null = null;
    await act(async () => {
      openedId = await result.current.openFolder();
    });

    expect(openedId).toBeTruthy();
    await waitFor(() => expect(result.current.guides).toHaveLength(1));
    expect(result.current.guides?.[0].folderName).toBe("0-overview");
  });

  it("reuses the existing entry when the same folder is opened again", async () => {
    mockPick.mockResolvedValue(handle("0-overview", "key-1"));
    const { result } = renderHook(() => useGuideLibrary());
    await waitFor(() => expect(result.current.guides).toEqual([]));

    let firstId: string | null = null;
    let secondId: string | null = null;
    await act(async () => {
      firstId = await result.current.openFolder();
    });
    await act(async () => {
      secondId = await result.current.openFolder();
    });

    expect(secondId).toBe(firstId);
    expect(result.current.guides).toHaveLength(1);
  });

  it("returns null and keeps recents when the picker is cancelled", async () => {
    mockPick.mockRejectedValue(new UserCancelledFolderPickError());
    const { result } = renderHook(() => useGuideLibrary());
    await waitFor(() => expect(result.current.guides).toEqual([]));

    let openedId: string | null = "x";
    await act(async () => {
      openedId = await result.current.openFolder();
    });

    expect(openedId).toBeNull();
    expect(result.current.guides).toEqual([]);
  });

  it("forgets a guide", async () => {
    mockPick.mockResolvedValue(handle("0-overview", "key-1"));
    const { result } = renderHook(() => useGuideLibrary());
    await waitFor(() => expect(result.current.guides).toEqual([]));

    let openedId = "";
    await act(async () => {
      openedId = (await result.current.openFolder()) ?? "";
    });
    await waitFor(() => expect(result.current.guides).toHaveLength(1));

    await act(async () => {
      await result.current.forget(openedId);
    });

    await waitFor(() => expect(result.current.guides).toEqual([]));
  });

  it("reports which guides have a persisted draft", async () => {
    mockPick.mockResolvedValue(handle("0-overview", "key-1"));
    const { result } = renderHook(() => useGuideLibrary());
    await waitFor(() => expect(result.current.guides).toEqual([]));

    let openedId = "";
    await act(async () => {
      openedId = (await result.current.openFolder()) ?? "";
    });
    expect(result.current.draftIds.has(openedId)).toBe(false);

    await putDraft({
      guideId: openedId,
      mode: "raw",
      rawSource: "# Edit",
      baseSource: "# Base",
      baseHash: "hash",
      updatedAt: 1,
    });
    await act(async () => {
      await result.current.openFolder();
    });

    await waitFor(() =>
      expect(result.current.draftIds.has(openedId)).toBe(true),
    );
  });
});
