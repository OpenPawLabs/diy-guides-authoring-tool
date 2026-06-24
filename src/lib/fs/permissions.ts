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
  if (!(await requestReadWritePermission(handle))) {
    throw new PermissionLostError();
  }
}

/**
 * Query, then request read/write access for a stored handle, returning whether
 * it is granted. Must run inside a user gesture for the prompt to appear. Unlike
 * {@link ensureReadWritePermission} this reports denial as `false` rather than
 * throwing, so callers can keep an "Allow access" prompt on screen.
 */
export async function requestReadWritePermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  const permissionHandle = toPermissionCapableHandle(handle);

  if ((await permissionHandle.queryPermission(readWritePermission)) === "granted") {
    return true;
  }

  return (
    (await permissionHandle.requestPermission(readWritePermission)) === "granted"
  );
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
