import {
  UnsupportedFileSystemAccessError,
  UserCancelledFolderPickError,
} from "./types";

type DirectoryPickerWindow = Window &
  typeof globalThis & {
    showDirectoryPicker(options?: {
      mode?: "read" | "readwrite";
    }): Promise<FileSystemDirectoryHandle>;
  };

export function supportsDirectoryPicker(): boolean {
  return "showDirectoryPicker" in window;
}

export async function pickGuideFolder(): Promise<FileSystemDirectoryHandle> {
  if (!supportsDirectoryPicker()) {
    throw new UnsupportedFileSystemAccessError();
  }

  try {
    return await (window as DirectoryPickerWindow).showDirectoryPicker({
      mode: "readwrite",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new UserCancelledFolderPickError();
    }

    throw error;
  }
}
