export interface ChapterStatus {
  folderName: string;
  guideMdxExists: boolean;
  imagesDirExists: boolean;
  guideMdxLastModified?: number;
  guideMdxSize?: number;
}

export type ChapterLoadResult =
  | {
      kind: "ready";
      status: ChapterStatus & { guideMdxExists: true };
    }
  | {
      kind: "missing-guide";
      status: ChapterStatus & { guideMdxExists: false };
    };

export type CreateChapterResult =
  | {
      kind: "created";
      status: ChapterStatus & { guideMdxExists: true; imagesDirExists: true };
    }
  | {
      kind: "already-exists";
      status: ChapterStatus & { guideMdxExists: true };
    };

export interface StoredChapterHandle {
  id: string;
  name: string;
  handle: FileSystemDirectoryHandle;
  updatedAt: number;
}

export class UserCancelledFolderPickError extends Error {
  constructor() {
    super("Folder selection was cancelled.");
    this.name = "UserCancelledFolderPickError";
  }
}

export class UnsupportedFileSystemAccessError extends Error {
  constructor() {
    super("This browser does not support the File System Access API.");
    this.name = "UnsupportedFileSystemAccessError";
  }
}

export class PermissionLostError extends Error {
  constructor() {
    super("Folder permission was lost. Please re-open the folder.");
    this.name = "PermissionLostError";
  }
}
