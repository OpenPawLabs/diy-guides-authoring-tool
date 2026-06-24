import { describe, expect, it } from "vitest";
import {
  ensureReadWritePermission,
  hasReadWritePermission,
  requestReadWritePermission,
} from "../lib/fs/permissions";
import { PermissionLostError } from "../lib/fs/types";

describe("permissions", () => {
  it("reports granted read/write permission", async () => {
    const handle = createPermissionHandle("granted");

    await expect(hasReadWritePermission(handle)).resolves.toBe(true);
  });

  it("requests permission when a write operation needs it", async () => {
    const handle = createPermissionHandle("prompt", "granted");

    await expect(ensureReadWritePermission(handle)).resolves.toBeUndefined();
  });

  it("throws when read/write permission is denied", async () => {
    const handle = createPermissionHandle("prompt", "denied");

    await expect(ensureReadWritePermission(handle)).rejects.toBeInstanceOf(
      PermissionLostError,
    );
  });

  it("reports whether a re-prompt was granted without throwing", async () => {
    await expect(
      requestReadWritePermission(createPermissionHandle("prompt", "granted")),
    ).resolves.toBe(true);

    await expect(
      requestReadWritePermission(createPermissionHandle("prompt", "denied")),
    ).resolves.toBe(false);
  });
});

function createPermissionHandle(
  queryState: PermissionState,
  requestState: PermissionState = queryState,
): FileSystemDirectoryHandle {
  return {
    name: "chapter",
    queryPermission: async () => queryState,
    requestPermission: async () => requestState,
  } as unknown as FileSystemDirectoryHandle;
}
