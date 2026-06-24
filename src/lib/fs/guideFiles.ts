import { blankGuideMdx } from "../templates/blankGuideMdx";
import { FILES_DIR, GUIDE_MDX, IMAGES_DIR } from "./constants";
import { sanitizeImageName, uniqueImageName } from "./imageNames";
import { ensureReadWritePermission, isMissingEntryError } from "./permissions";
import type {
  CreateGuideResult,
  GuideFolderStatus,
  GuideLoadResult,
} from "./types";

const KEEP_FILE = ".gitkeep";

export async function loadGuideFolder(
  directory: FileSystemDirectoryHandle,
): Promise<GuideLoadResult> {
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

export async function createBlankGuide(
  directory: FileSystemDirectoryHandle,
): Promise<CreateGuideResult> {
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
): Promise<GuideFolderStatus & { guideMdxExists: true }> {
  await ensureReadWritePermission(directory);

  const guideFile = await directory.getFileHandle(GUIDE_MDX);
  const writable = await guideFile.createWritable();
  await writable.write(content);
  await writable.close();

  return await getGuideFileStatus(directory, guideFile);
}

/**
 * Write an uploaded image into the guide's `images/` directory under a safe,
 * de-duplicated name and return the relative MDX source path (`./images/<name>`).
 */
export async function writeImageFile(
  directory: FileSystemDirectoryHandle,
  file: File,
): Promise<string> {
  await ensureReadWritePermission(directory);
  const images = await ensureImagesDirectory(directory);

  const existing: string[] = [];
  for await (const name of images.keys()) {
    existing.push(name);
  }

  const fileName = uniqueImageName(sanitizeImageName(file.name), existing);
  const handle = await images.getFileHandle(fileName, { create: true });
  const writable = await handle.createWritable();
  await writable.write(file);
  await writable.close();

  return `./${IMAGES_DIR}/${fileName}`;
}

export async function ensureImagesDirectory(
  directory: FileSystemDirectoryHandle,
): Promise<FileSystemDirectoryHandle> {
  return ensureAssetDirectory(directory, IMAGES_DIR);
}

/**
 * Write a downloadable asset (a 3D model, PDF, archive, …) into the guide's
 * `files/` directory under a safe, de-duplicated name and return the relative MDX
 * source path (`./files/<name>`).
 */
export async function writeDownloadFile(
  directory: FileSystemDirectoryHandle,
  file: File,
): Promise<string> {
  await ensureReadWritePermission(directory);
  const files = await ensureAssetDirectory(directory, FILES_DIR);

  const existing: string[] = [];
  for await (const name of files.keys()) {
    existing.push(name);
  }

  const fileName = uniqueImageName(sanitizeImageName(file.name), existing);
  const handle = await files.getFileHandle(fileName, { create: true });
  const writable = await handle.createWritable();
  await writable.write(file);
  await writable.close();

  return `./${FILES_DIR}/${fileName}`;
}

async function ensureAssetDirectory(
  directory: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemDirectoryHandle> {
  const assets = await directory.getDirectoryHandle(name, { create: true });
  const keepFile = await assets.getFileHandle(KEEP_FILE, { create: true });
  const writable = await keepFile.createWritable();
  await writable.write("");
  await writable.close();
  return assets;
}

async function getGuideFileStatus(
  directory: FileSystemDirectoryHandle,
  guideFile: FileSystemFileHandle,
): Promise<GuideFolderStatus & { guideMdxExists: true }> {
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
