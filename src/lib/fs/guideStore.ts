import type { EditorMode } from "../../hooks/useGuideDocument";
import type { GuideDifficulty, GuideDraft } from "../mdx/structuredGuide";
import {
  DRAFTS_STORE,
  GUIDE_DB,
  GUIDE_DB_VERSION,
  GUIDES_STORE,
  LEGACY_HANDLE_STORE,
} from "./constants";

/** A guide folder the author has opened before — the homepage "recents" entry. */
export interface StoredGuide {
  id: string;
  handle: FileSystemDirectoryHandle;
  folderName: string;
  title?: string;
  difficulty?: GuideDifficulty;
  lastOpenedAt: number;
  lastSavedAt?: number;
  /** Hash of the `guide.mdx` content the last time it was read or saved. */
  lastLoadedHash?: string;
}

/** Unsaved editor edits, persisted so a refresh or permission loss cannot drop them. */
export interface StoredDraft {
  guideId: string;
  mode: EditorMode;
  draft?: GuideDraft;
  rawSource?: string;
  /** Full MDX the edits are based on (non-owned regions preserved on serialize). */
  baseSource: string;
  /** Hash of the on-disk file when this edit session began. */
  baseHash: string;
  updatedAt: number;
}

/** Sort key for recents — most recently saved, else most recently opened. */
export function guideActivityTime(guide: StoredGuide): number {
  return guide.lastSavedAt ?? guide.lastOpenedAt;
}

export async function listGuides(): Promise<StoredGuide[]> {
  const guides = await withStore(GUIDES_STORE, "readonly", (store) =>
    requestToPromise<StoredGuide[]>(store.getAll()),
  );

  return guides.sort((a, b) => guideActivityTime(b) - guideActivityTime(a));
}

export async function getGuide(id: string): Promise<StoredGuide | null> {
  const guide = await withStore(GUIDES_STORE, "readonly", (store) =>
    requestToPromise<StoredGuide | undefined>(store.get(id)),
  );

  return guide ?? null;
}

export async function putGuide(guide: StoredGuide): Promise<void> {
  await withStore(GUIDES_STORE, "readwrite", (store) =>
    requestToPromise(store.put(guide)),
  );
}

/** Merge a partial update into an existing guide; no-op if it is gone. */
export async function updateGuide(
  id: string,
  patch: Partial<Omit<StoredGuide, "id">>,
): Promise<void> {
  const existing = await getGuide(id);
  if (!existing) {
    return;
  }

  await putGuide({ ...existing, ...patch });
}

export async function removeGuide(id: string): Promise<void> {
  await withStore(GUIDES_STORE, "readwrite", (store) =>
    requestToPromise(store.delete(id)),
  );
  await clearDraft(id);
}

/** Find a previously stored guide that points at the same folder on disk. */
export async function findGuideByHandle(
  handle: FileSystemDirectoryHandle,
): Promise<StoredGuide | null> {
  for (const guide of await listGuides()) {
    if (await handle.isSameEntry(guide.handle)) {
      return guide;
    }
  }

  return null;
}

export async function getDraft(guideId: string): Promise<StoredDraft | null> {
  const draft = await withStore(DRAFTS_STORE, "readonly", (store) =>
    requestToPromise<StoredDraft | undefined>(store.get(guideId)),
  );

  return draft ?? null;
}

export async function putDraft(draft: StoredDraft): Promise<void> {
  await withStore(DRAFTS_STORE, "readwrite", (store) =>
    requestToPromise(store.put(draft)),
  );
}

export async function clearDraft(guideId: string): Promise<void> {
  await withStore(DRAFTS_STORE, "readwrite", (store) =>
    requestToPromise(store.delete(guideId)),
  );
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await openDb();
  try {
    const transaction = db.transaction(storeName, mode);
    const result = await run(transaction.objectStore(storeName));
    await transactionDone(transaction);
    return result;
  } finally {
    db.close();
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(GUIDE_DB, GUIDE_DB_VERSION);

    request.onupgradeneeded = () => migrate(request.result, request.transaction);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function migrate(db: IDBDatabase, transaction: IDBTransaction | null): void {
  if (!db.objectStoreNames.contains(GUIDES_STORE)) {
    db.createObjectStore(GUIDES_STORE, { keyPath: "id" });
  }
  if (!db.objectStoreNames.contains(DRAFTS_STORE)) {
    db.createObjectStore(DRAFTS_STORE, { keyPath: "guideId" });
  }

  // Carry the single v1 handle forward as the first recents entry, then drop
  // the legacy store once it has been read (deleting before the async read
  // resolves would abort the copy).
  if (transaction && db.objectStoreNames.contains(LEGACY_HANDLE_STORE)) {
    const legacy = transaction.objectStore(LEGACY_HANDLE_STORE);
    const guides = transaction.objectStore(GUIDES_STORE);
    legacy.getAll().onsuccess = (event) => {
      const records = (event.target as IDBRequest<LegacyHandle[]>).result ?? [];
      for (const record of records) {
        guides.put({
          id: crypto.randomUUID(),
          handle: record.handle,
          folderName: record.name,
          lastOpenedAt: record.updatedAt ?? Date.now(),
        } satisfies StoredGuide);
      }
      db.deleteObjectStore(LEGACY_HANDLE_STORE);
    };
  }
}

interface LegacyHandle {
  name: string;
  handle: FileSystemDirectoryHandle;
  updatedAt?: number;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
