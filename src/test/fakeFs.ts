/** In-memory File System Access handles for tests. */

export class FakeFileHandle {
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

export class FakeDirectoryHandle {
  readonly files = new Map<string, FakeFileHandle>();
  readonly directories = new Map<string, FakeDirectoryHandle>();

  constructor(
    readonly name: string,
    private queryState: PermissionState = "granted",
    private requestState: PermissionState = "granted",
  ) {}

  async queryPermission(): Promise<PermissionState> {
    return this.queryState;
  }

  async requestPermission(): Promise<PermissionState> {
    this.queryState = this.requestState;
    return this.requestState;
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

  async *keys(): AsyncIterableIterator<string> {
    yield* this.files.keys();
    yield* this.directories.keys();
  }

  asDirectoryHandle(): FileSystemDirectoryHandle {
    return this as unknown as FileSystemDirectoryHandle;
  }
}

export function readyDirectory(content: string): FakeDirectoryHandle {
  const directory = new FakeDirectoryHandle("0-overview");
  directory.files.set("guide.mdx", new FakeFileHandle("guide.mdx", content));
  directory.directories.set("images", new FakeDirectoryHandle("images"));
  return directory;
}
