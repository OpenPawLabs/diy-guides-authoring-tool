import { blankGuideMdx } from "../templates/blankGuideMdx";
import { GUIDE_MDX, IMAGES_DIR } from "./constants";
import { ensureReadWritePermission, isMissingEntryError } from "./permissions";
import type { ChapterLoadResult, ChapterStatus, CreateChapterResult } from "./types";

const KEEP_FILE = ".gitkeep";

export async function loadChapterFolder(
  directory: FileSystemDirectoryHandle,
): Promise<ChapterLoadResult> {
  await ensureReadWritePermission(directory);

  const guideFile = await getFileHandle(directory, GUIDE_MDX);
  const imagesDirExists = await directoryExists(directory, IMAGES_DIR);

  if (!guideFile) {
    return {
      kind: "missing-guide",
      status: {
        folderName: directory.name,
        guideMdxExists: false,
        imagesDirExists,
      },
    };
  }

  return {
    kind: "ready",
    status: {
      ...(await getGuideFileStatus(directory, guideFile)),
      imagesDirExists,
    },
  };
}

export async function createBlankChapter(
  directory: FileSystemDirectoryHandle,
): Promise<CreateChapterResult> {
  await ensureReadWritePermission(directory);

  const existingGuide = await getFileHandle(directory, GUIDE_MDX);

  if (existingGuide) {
    return {
      kind: "already-exists",
      status: {
        ...(await getGuideFileStatus(directory, existingGuide)),
        imagesDirExists: await directoryExists(directory, IMAGES_DIR),
      },
    };
  }

  const guideFile = await directory.getFileHandle(GUIDE_MDX, { create: true });
  const writable = await guideFile.createWritable();
  await writable.write(blankGuideMdx);
  await writable.close();

  await ensureImagesDirectory(directory);

  return {
    kind: "created",
    status: {
      ...(await getGuideFileStatus(directory, guideFile)),
      imagesDirExists: true,
    },
  };
}

export async function readGuideMdx(
  directory: FileSystemDirectoryHandle,
): Promise<string> {
  await ensureReadWritePermission(directory);

  const guideFile = await directory.getFileHandle(GUIDE_MDX);
  return await (await guideFile.getFile()).text();
}

export async function writeGuideMdx(
  directory: FileSystemDirectoryHandle,
  content: string,
): Promise<ChapterStatus & { guideMdxExists: true }> {
  await ensureReadWritePermission(directory);

  const guideFile = await directory.getFileHandle(GUIDE_MDX);
  const writable = await guideFile.createWritable();
  await writable.write(content);
  await writable.close();

  return await getGuideFileStatus(directory, guideFile);
}

export async function ensureImagesDirectory(
  directory: FileSystemDirectoryHandle,
): Promise<FileSystemDirectoryHandle> {
  const images = await directory.getDirectoryHandle(IMAGES_DIR, { create: true });
  const keepFile = await images.getFileHandle(KEEP_FILE, { create: true });
  const writable = await keepFile.createWritable();
  await writable.write("");
  await writable.close();
  return images;
}

async function getGuideFileStatus(
  directory: FileSystemDirectoryHandle,
  guideFile: FileSystemFileHandle,
): Promise<ChapterStatus & { guideMdxExists: true }> {
  const file = await guideFile.getFile();

  return {
    folderName: directory.name,
    guideMdxExists: true,
    imagesDirExists: await directoryExists(directory, IMAGES_DIR),
    guideMdxLastModified: file.lastModified,
    guideMdxSize: file.size,
  };
}

async function getFileHandle(
  directory: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemFileHandle | null> {
  try {
    return await directory.getFileHandle(name);
  } catch (error) {
    if (isMissingEntryError(error)) {
      return null;
    }

    throw error;
  }
}

async function directoryExists(
  directory: FileSystemDirectoryHandle,
  name: string,
): Promise<boolean> {
  try {
    await directory.getDirectoryHandle(name);
    return true;
  } catch (error) {
    if (isMissingEntryError(error)) {
      return false;
    }

    throw error;
  }
}
