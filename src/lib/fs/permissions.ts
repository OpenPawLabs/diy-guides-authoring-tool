import { PermissionLostError } from "./types";

const readWritePermission = { mode: "readwrite" } as const;

interface FileSystemAccessPermissionDescriptor {
  mode?: "read" | "readwrite";
}

type PermissionCapableDirectoryHandle = FileSystemDirectoryHandle & {
  queryPermission(
    descriptor?: FileSystemAccessPermissionDescriptor,
  ): Promise<PermissionState>;
  requestPermission(
    descriptor?: FileSystemAccessPermissionDescriptor,
  ): Promise<PermissionState>;
};

export async function hasReadWritePermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  return (
    (await toPermissionCapableHandle(handle).queryPermission(readWritePermission)) ===
    "granted"
  );
}

export async function ensureReadWritePermission(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const permissionHandle = toPermissionCapableHandle(handle);

  if ((await permissionHandle.queryPermission(readWritePermission)) === "granted") {
    return;
  }

  if ((await permissionHandle.requestPermission(readWritePermission)) !== "granted") {
    throw new PermissionLostError();
  }
}

export function isPermissionLostError(error: unknown): boolean {
  return (
    error instanceof PermissionLostError ||
    isDomException(error, "NotAllowedError") ||
    isDomException(error, "SecurityError")
  );
}

export function isMissingEntryError(error: unknown): boolean {
  return isDomException(error, "NotFoundError");
}

function isDomException(error: unknown, name: string): boolean {
  return error instanceof DOMException && error.name === name;
}

function toPermissionCapableHandle(
  handle: FileSystemDirectoryHandle,
): PermissionCapableDirectoryHandle {
  return handle as PermissionCapableDirectoryHandle;
}
