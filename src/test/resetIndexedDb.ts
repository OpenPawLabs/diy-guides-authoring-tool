import { GUIDE_DB } from "../lib/fs/constants";

/**
 * Delete the app's IndexedDB between tests so each starts from a clean store.
 *
 * Fire-and-forget store writes from a prior test (recents updates, draft
 * mirroring) can still hold a connection open when the next `beforeEach` runs,
 * which fires `onblocked`. That block is transient — the store always closes its
 * connections — so we wait for `onsuccess` rather than rejecting, per the
 * IndexedDB contract. Only a real `onerror` rejects.
 */
export function resetIndexedDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(GUIDE_DB);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
