import { describe, expect, it } from "vitest";
import {
  createBlankChapter,
  loadChapterFolder,
  readGuideMdx,
  writeGuideMdx,
} from "../lib/fs/chapterFiles";
import { GUIDE_MDX, IMAGES_DIR } from "../lib/fs/constants";

describe("chapterFiles", () => {
  it("loads an existing guide chapter", async () => {
    const directory = new FakeDirectoryHandle("0-overview");
    directory.files.set(GUIDE_MDX, new FakeFileHandle(GUIDE_MDX, "# Guide"));
    directory.directories.set(IMAGES_DIR, new FakeDirectoryHandle(IMAGES_DIR));

    const result = await loadChapterFolder(directory.asDirectoryHandle());

    expect(result.kind).toBe("ready");
    expect(result.status.folderName).toBe("0-overview");
    expect(result.status.guideMdxExists).toBe(true);
    expect(result.status.imagesDirExists).toBe(true);
  });

  it("reports a missing guide without creating files", async () => {
    const directory = new FakeDirectoryHandle("0-overview");

    const result = await loadChapterFolder(directory.asDirectoryHandle());

    expect(result.kind).toBe("missing-guide");
    expect(result.status.guideMdxExists).toBe(false);
    expect(directory.files.has(GUIDE_MDX)).toBe(false);
  });

  it("creates a blank guide and image directory", async () => {
    const directory = new FakeDirectoryHandle("new-chapter");

    const result = await createBlankChapter(directory.asDirectoryHandle());

    expect(result.kind).toBe("created");
    expect(directory.files.get(GUIDE_MDX)?.content).toContain("<GuideLayout>");
    expect(directory.directories.has(IMAGES_DIR)).toBe(true);
    expect(directory.directories.get(IMAGES_DIR)?.files.has(".gitkeep")).toBe(
      true,
    );
  });

  it("does not overwrite an existing guide", async () => {
    const directory = new FakeDirectoryHandle("existing-chapter");
    directory.files.set(GUIDE_MDX, new FakeFileHandle(GUIDE_MDX, "# Keep me"));

    const result = await createBlankChapter(directory.asDirectoryHandle());

    expect(result.kind).toBe("already-exists");
    expect(directory.files.get(GUIDE_MDX)?.content).toBe("# Keep me");
  });

  it("reads guide.mdx content", async () => {
    const directory = new FakeDirectoryHandle("existing-chapter");
    directory.files.set(GUIDE_MDX, new FakeFileHandle(GUIDE_MDX, "# Guide"));

    await expect(readGuideMdx(directory.asDirectoryHandle())).resolves.toBe(
      "# Guide",
    );
  });

  it("writes guide.mdx content and returns refreshed metadata", async () => {
    const directory = new FakeDirectoryHandle("existing-chapter");
    directory.files.set(GUIDE_MDX, new FakeFileHandle(GUIDE_MDX, "# Old"));
    directory.directories.set(IMAGES_DIR, new FakeDirectoryHandle(IMAGES_DIR));

    const status = await writeGuideMdx(directory.asDirectoryHandle(), "# New");

    expect(directory.files.get(GUIDE_MDX)?.content).toBe("# New");
    expect(status.guideMdxExists).toBe(true);
    expect(status.imagesDirExists).toBe(true);
    expect(status.guideMdxSize).toBe(5);
    expect(status.guideMdxLastModified).toBe(2);
  });
});

class FakeDirectoryHandle {
  readonly files = new Map<string, FakeFileHandle>();
  readonly directories = new Map<string, FakeDirectoryHandle>();

  constructor(readonly name: string) {}

  async queryPermission(): Promise<PermissionState> {
    return "granted";
  }

  async requestPermission(): Promise<PermissionState> {
    return "granted";
  }

  async getFileHandle(
    name: string,
    options: { create?: boolean } = {},
  ): Promise<FileSystemFileHandle> {
    const existing = this.files.get(name);
    if (existing) {
      return existing.asFileHandle();
    }

    if (!options.create) {
      throw new DOMException("File not found", "NotFoundError");
    }

    const created = new FakeFileHandle(name, "");
    this.files.set(name, created);
    return created.asFileHandle();
  }

  async getDirectoryHandle(
    name: string,
    options: { create?: boolean } = {},
  ): Promise<FileSystemDirectoryHandle> {
    const existing = this.directories.get(name);
    if (existing) {
      return existing.asDirectoryHandle();
    }

    if (!options.create) {
      throw new DOMException("Directory not found", "NotFoundError");
    }

    const created = new FakeDirectoryHandle(name);
    this.directories.set(name, created);
    return created.asDirectoryHandle();
  }

  asDirectoryHandle(): FileSystemDirectoryHandle {
    return this as unknown as FileSystemDirectoryHandle;
  }
}

class FakeFileHandle {
  lastModified = 1;

  constructor(
    readonly name: string,
    public content: string,
  ) {}

  async getFile(): Promise<File> {
    return new File([this.content], this.name, {
      lastModified: this.lastModified,
    });
  }

  async createWritable(): Promise<FileSystemWritableFileStream> {
    let nextContent = this.content;

    return {
      write: async (data: FileSystemWriteChunkType) => {
        nextContent = typeof data === "string" ? data : String(data);
      },
      close: async () => {
        this.content = nextContent;
        this.lastModified += 1;
      },
    } as unknown as FileSystemWritableFileStream;
  }

  asFileHandle(): FileSystemFileHandle {
    return this as unknown as FileSystemFileHandle;
  }
}
