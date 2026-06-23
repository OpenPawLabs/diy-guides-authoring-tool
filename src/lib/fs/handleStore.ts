import {
  CHAPTER_HANDLE_DB,
  CHAPTER_HANDLE_KEY,
  CHAPTER_HANDLE_STORE,
} from "./constants";
import type { StoredChapterHandle } from "./types";

export async function getStoredChapterHandle(): Promise<StoredChapterHandle | null> {
  if (!("indexedDB" in globalThis)) {
    return null;
  }

  const db = await openHandleDb();
  try {
    const transaction = db.transaction(CHAPTER_HANDLE_STORE, "readonly");
    const request = transaction
      .objectStore(CHAPTER_HANDLE_STORE)
      .get(CHAPTER_HANDLE_KEY);
    const value = await requestToPromise<StoredChapterHandle | undefined>(request);
    return value ?? null;
  } finally {
    db.close();
  }
}

export async function saveChapterHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const db = await openHandleDb();
  try {
    const transaction = db.transaction(CHAPTER_HANDLE_STORE, "readwrite");
    transaction.objectStore(CHAPTER_HANDLE_STORE).put({
      id: CHAPTER_HANDLE_KEY,
      name: handle.name,
      handle,
      updatedAt: Date.now(),
    } satisfies StoredChapterHandle);
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}

export async function clearStoredChapterHandle(): Promise<void> {
  if (!("indexedDB" in globalThis)) {
    return;
  }

  const db = await openHandleDb();
  try {
    const transaction = db.transaction(CHAPTER_HANDLE_STORE, "readwrite");
    transaction.objectStore(CHAPTER_HANDLE_STORE).delete(CHAPTER_HANDLE_KEY);
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CHAPTER_HANDLE_DB, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CHAPTER_HANDLE_STORE)) {
        db.createObjectStore(CHAPTER_HANDLE_STORE, { keyPath: "id" });
      }
    };

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
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
