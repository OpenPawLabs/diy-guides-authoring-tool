import { describe, expect, it } from "vitest";
import {
  createBlankGuide,
  loadGuideFolder,
  readGuideMdx,
  writeGuideMdx,
} from "../lib/fs/guideFiles";
import { GUIDE_MDX, IMAGES_DIR } from "../lib/fs/constants";
import { FakeDirectoryHandle, FakeFileHandle } from "./fakeFs";

describe("guideFiles", () => {
  it("loads an existing guide folder", async () => {
    const directory = new FakeDirectoryHandle("0-overview");
    directory.files.set(GUIDE_MDX, new FakeFileHandle(GUIDE_MDX, "# Guide"));
    directory.directories.set(IMAGES_DIR, new FakeDirectoryHandle(IMAGES_DIR));

    const result = await loadGuideFolder(directory.asDirectoryHandle());

    expect(result.kind).toBe("ready");
    expect(result.status.folderName).toBe("0-overview");
    expect(result.status.guideMdxExists).toBe(true);
    expect(result.status.imagesDirExists).toBe(true);
  });

  it("reports a missing guide without creating files", async () => {
    const directory = new FakeDirectoryHandle("0-overview");

    const result = await loadGuideFolder(directory.asDirectoryHandle());

    expect(result.kind).toBe("missing-guide");
    expect(result.status.guideMdxExists).toBe(false);
    expect(directory.files.has(GUIDE_MDX)).toBe(false);
  });

  it("creates a blank guide and image directory", async () => {
    const directory = new FakeDirectoryHandle("new-guide");

    const result = await createBlankGuide(directory.asDirectoryHandle());

    expect(result.kind).toBe("created");
    expect(directory.files.get(GUIDE_MDX)?.content).toContain("<GuideLayout>");
    expect(directory.directories.has(IMAGES_DIR)).toBe(true);
    expect(directory.directories.get(IMAGES_DIR)?.files.has(".gitkeep")).toBe(
      true,
    );
  });

  it("does not overwrite an existing guide", async () => {
    const directory = new FakeDirectoryHandle("existing-guide");
    directory.files.set(GUIDE_MDX, new FakeFileHandle(GUIDE_MDX, "# Keep me"));

    const result = await createBlankGuide(directory.asDirectoryHandle());

    expect(result.kind).toBe("already-exists");
    expect(directory.files.get(GUIDE_MDX)?.content).toBe("# Keep me");
  });

  it("reads guide.mdx content", async () => {
    const directory = new FakeDirectoryHandle("existing-guide");
    directory.files.set(GUIDE_MDX, new FakeFileHandle(GUIDE_MDX, "# Guide"));

    await expect(readGuideMdx(directory.asDirectoryHandle())).resolves.toBe(
      "# Guide",
    );
  });

  it("writes guide.mdx content and returns refreshed metadata", async () => {
    const directory = new FakeDirectoryHandle("existing-guide");
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
