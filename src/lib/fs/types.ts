export interface GuideFolderStatus {
  folderName: string;
  guideMdxExists: boolean;
  imagesDirExists: boolean;
  guideMdxLastModified?: number;
  guideMdxSize?: number;
}

export type GuideLoadResult =
  | {
      kind: "ready";
      status: GuideFolderStatus & { guideMdxExists: true };
    }
  | {
      kind: "missing-guide";
      status: GuideFolderStatus & { guideMdxExists: false };
    };

export type CreateGuideResult =
  | {
      kind: "created";
      status: GuideFolderStatus & { guideMdxExists: true; imagesDirExists: true };
    }
  | {
      kind: "already-exists";
      status: GuideFolderStatus & { guideMdxExists: true };
    };

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
