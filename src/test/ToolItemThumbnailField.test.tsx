import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToolItemThumbnailField } from "../components/ToolItemThumbnailField";
import { writeImageFile } from "../lib/fs/guideFiles";
import { FakeDirectoryHandle } from "./fakeFs";

vi.mock("../lib/fs/guideFiles", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/fs/guideFiles")>();
  return {
    ...actual,
    writeImageFile: vi.fn(),
  };
});

const mockWriteImageFile = vi.mocked(writeImageFile);

describe("ToolItemThumbnailField", () => {
  beforeEach(() => {
    mockWriteImageFile.mockReset();
    mockWriteImageFile.mockResolvedValue("./images/foo.jpg");
  });

  it("uploads an image and calls onChange with the relative path", async () => {
    const onChange = vi.fn();
    const directory = new FakeDirectoryHandle("guide").asDirectoryHandle();

    render(<ToolItemThumbnailField directory={directory} onChange={onChange} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["image"], "tool.jpg", { type: "image/jpeg" });

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(mockWriteImageFile).toHaveBeenCalledWith(directory, file);
      expect(onChange).toHaveBeenCalledWith("./images/foo.jpg");
    });
  });

  it("rejects non-image files", async () => {
    const onChange = vi.fn();
    const directory = new FakeDirectoryHandle("guide").asDirectoryHandle();

    render(<ToolItemThumbnailField directory={directory} onChange={onChange} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["video"], "clip.mp4", { type: "video/mp4" });

    await userEvent.upload(input, file);

    expect(mockWriteImageFile).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clears the thumbnail when Remove is clicked", async () => {
    const onChange = vi.fn();
    const directory = new FakeDirectoryHandle("guide").asDirectoryHandle();

    render(
      <ToolItemThumbnailField
        directory={directory}
        thumbnail="https://example.com/tool.jpg"
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
