import { beforeEach, describe, expect, it } from "vitest";
import { GUIDE_DB, LEGACY_HANDLE_STORE } from "../lib/fs/constants";
import { resetIndexedDb } from "./resetIndexedDb";
import {
  clearDraft,
  findGuideByHandle,
  getDraft,
  getGuide,
  listDraftIds,
  listGuides,
  putDraft,
  putGuide,
  removeGuide,
  updateGuide,
  type StoredGuide,
} from "../lib/fs/guideStore";

/** A handle whose identity survives IndexedDB's structured clone via the `key` field. */
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

function guide(
  id: string,
  name = id,
  extra: Partial<StoredGuide> = {},
): StoredGuide {
  return {
    id,
    handle: handle(name, id),
    folderName: name,
    lastOpenedAt: Date.now(),
    ...extra,
  };
}

beforeEach(resetIndexedDb);

describe("guideStore guides", () => {
  it("stores, lists, and removes guides", async () => {
    await putGuide(guide("a"));
    await putGuide(guide("b"));

    expect((await listGuides()).map((g) => g.id).sort()).toEqual(["a", "b"]);

    await removeGuide("a");

    expect(await getGuide("a")).toBeNull();
    expect((await listGuides()).map((g) => g.id)).toEqual(["b"]);
  });

  it("orders recents by activity time, newest first", async () => {
    await putGuide(guide("old", "old", { lastOpenedAt: 1 }));
    await putGuide(guide("recent", "recent", { lastOpenedAt: 2, lastSavedAt: 100 }));
    await putGuide(guide("mid", "mid", { lastOpenedAt: 50 }));

    expect((await listGuides()).map((g) => g.id)).toEqual(["recent", "mid", "old"]);
  });

  it("dedupes a folder by handle identity", async () => {
    await putGuide(guide("a", "Guide A"));

    const match = await findGuideByHandle(handle("Guide A", "a"));
    expect(match?.id).toBe("a");

    const miss = await findGuideByHandle(handle("Other", "z"));
    expect(miss).toBeNull();
  });

  it("merges partial updates and ignores missing guides", async () => {
    await putGuide(guide("a"));

    await updateGuide("a", { title: "Hello", lastSavedAt: 5 });
    const updated = await getGuide("a");
    expect(updated?.title).toBe("Hello");
    expect(updated?.lastSavedAt).toBe(5);

    await expect(updateGuide("missing", { title: "noop" })).resolves.toBeUndefined();
  });

  it("remembers the last open step across reads", async () => {
    await putGuide(guide("a"));

    await updateGuide("a", { lastStep: 2 });
    expect((await getGuide("a"))?.lastStep).toBe(2);

    await updateGuide("a", { lastStep: "overview" });
    expect((await getGuide("a"))?.lastStep).toBe("overview");
  });
});

describe("guideStore drafts", () => {
  it("saves, reads, and clears a draft", async () => {
    await putDraft({
      guideId: "a",
      mode: "raw",
      rawSource: "# Edit",
      baseSource: "# Base",
      baseHash: "hash",
      updatedAt: 1,
    });

    expect((await getDraft("a"))?.rawSource).toBe("# Edit");

    await clearDraft("a");
    expect(await getDraft("a")).toBeNull();
  });

  it("lists the ids of guides with a persisted draft", async () => {
    expect(await listDraftIds()).toEqual([]);

    await putDraft({
      guideId: "with-draft",
      mode: "raw",
      rawSource: "# Edit",
      baseSource: "# Base",
      baseHash: "hash",
      updatedAt: 1,
    });

    expect(await listDraftIds()).toEqual(["with-draft"]);

    await clearDraft("with-draft");
    expect(await listDraftIds()).toEqual([]);
  });

  it("clears the draft when its guide is removed", async () => {
    await putGuide(guide("b"));
    await putDraft({
      guideId: "b",
      mode: "raw",
      rawSource: "x",
      baseSource: "x",
      baseHash: "h",
      updatedAt: 1,
    });

    await removeGuide("b");

    expect(await getDraft("b")).toBeNull();
  });
});

describe("guideStore migration", () => {
  it("carries a v1 chapter handle into the guides store", async () => {
    await seedLegacyDatabase();

    const guides = await listGuides();

    expect(guides).toHaveLength(1);
    expect(guides[0].folderName).toBe("0-overview");
  });
});

function seedLegacyDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(GUIDE_DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(LEGACY_HANDLE_STORE, { keyPath: "id" });
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(LEGACY_HANDLE_STORE, "readwrite");
      transaction.objectStore(LEGACY_HANDLE_STORE).put({
        id: "chapter-folder-handle",
        name: "0-overview",
        handle: handle("0-overview"),
        updatedAt: 10,
      });
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    };
  });
}
