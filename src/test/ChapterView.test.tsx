import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChapterView } from "../pages/ChapterView";
import { GUIDE_MDX, IMAGES_DIR } from "../lib/fs/constants";

vi.mock("../components/GuidePreview", () => ({
  GuidePreview: ({ source }: { source: string }) => (
    <div data-testid="guide-preview">{source}</div>
  ),
}));

describe("ChapterView", () => {
  it("loads, edits, and saves guide.mdx", async () => {
    const directory = readyDirectory("# Initial");

    render(
      <ChapterView
        chapter={chapterStatus(directory)}
        chapterHandle={directory.asDirectoryHandle()}
        isLoading={false}
        mode="ready"
        onCloseChapter={vi.fn()}
        onCreateGuide={vi.fn()}
        onPermissionLost={vi.fn()}
        onUseExistingGuide={vi.fn()}
      />,
    );

    const editor = await screen.findByLabelText("MDX source");
    expect(editor).toHaveValue("# Initial");

    fireEvent.change(editor, { target: { value: "# Edited" } });
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    expect(screen.getByTestId("guide-preview")).toHaveTextContent("# Edited");

    await userEvent.click(screen.getByRole("button", { name: "Save guide.mdx" }));

    await waitFor(() => {
      expect(directory.files.get(GUIDE_MDX)?.content).toBe("# Edited");
      expect(screen.getByText("Saved")).toBeInTheDocument();
    });
  });

  it("guards closing a chapter with unsaved changes", async () => {
    const directory = readyDirectory("# Initial");
    const onCloseChapter = vi.fn();
    const addEventListener = vi.spyOn(window, "addEventListener");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(
      <ChapterView
        chapter={chapterStatus(directory)}
        chapterHandle={directory.asDirectoryHandle()}
        isLoading={false}
        mode="ready"
        onCloseChapter={onCloseChapter}
        onCreateGuide={vi.fn()}
        onPermissionLost={vi.fn()}
        onUseExistingGuide={vi.fn()}
      />,
    );

    fireEvent.change(await screen.findByLabelText("MDX source"), {
      target: { value: "# Unsaved" },
    });

    await waitFor(() => {
      expect(addEventListener).toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function),
      );
    });

    const beforeUnloadHandler = addEventListener.mock.calls.find(
      ([eventName]) => eventName === "beforeunload",
    )?.[1] as (event: BeforeUnloadEvent) => void;
    const beforeUnload = {
      preventDefault: vi.fn(),
      returnValue: undefined,
    } as unknown as BeforeUnloadEvent;
    beforeUnloadHandler(beforeUnload);
    expect(beforeUnload.preventDefault).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Close chapter" }));

    expect(confirm).toHaveBeenCalled();
    expect(onCloseChapter).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await userEvent.click(screen.getByRole("button", { name: "Close chapter" }));

    expect(onCloseChapter).toHaveBeenCalledTimes(1);
    addEventListener.mockRestore();
    confirm.mockRestore();
  });
});

function readyDirectory(content: string) {
  const directory = new FakeDirectoryHandle("0-overview");
  directory.files.set(GUIDE_MDX, new FakeFileHandle(GUIDE_MDX, content));
  directory.directories.set(IMAGES_DIR, new FakeDirectoryHandle(IMAGES_DIR));
  return directory;
}

function chapterStatus(directory: FakeDirectoryHandle) {
  return {
    folderName: directory.name,
    guideMdxExists: true as const,
    imagesDirExists: true,
    guideMdxLastModified: 1,
    guideMdxSize: directory.files.get(GUIDE_MDX)?.content.length ?? 0,
  };
}

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

  async getFileHandle(name: string): Promise<FileSystemFileHandle> {
    const existing = this.files.get(name);
    if (!existing) {
      throw new DOMException("File not found", "NotFoundError");
    }

    return existing.asFileHandle();
  }

  async getDirectoryHandle(name: string): Promise<FileSystemDirectoryHandle> {
    const existing = this.directories.get(name);
    if (!existing) {
      throw new DOMException("Directory not found", "NotFoundError");
    }

    return existing.asDirectoryHandle();
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
