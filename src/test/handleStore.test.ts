import { beforeEach, describe, expect, it } from "vitest";
import { CHAPTER_HANDLE_DB } from "../lib/fs/constants";
import {
  clearStoredChapterHandle,
  getStoredChapterHandle,
  saveChapterHandle,
} from "../lib/fs/handleStore";

describe("handleStore", () => {
  beforeEach(async () => {
    await deleteHandleDatabase();
  });

  it("stores and restores a chapter folder handle", async () => {
    const handle = { name: "0-overview" } as FileSystemDirectoryHandle;

    await saveChapterHandle(handle);
    const stored = await getStoredChapterHandle();

    expect(stored?.name).toBe("0-overview");
    expect(stored?.handle.name).toBe("0-overview");
    expect(stored?.updatedAt).toEqual(expect.any(Number));
  });

  it("clears the stored chapter folder handle", async () => {
    await saveChapterHandle({ name: "0-overview" } as FileSystemDirectoryHandle);

    await clearStoredChapterHandle();

    await expect(getStoredChapterHandle()).resolves.toBeNull();
  });
});

function deleteHandleDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(CHAPTER_HANDLE_DB);

    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("IndexedDB delete was blocked."));
    request.onsuccess = () => resolve();
  });
}
