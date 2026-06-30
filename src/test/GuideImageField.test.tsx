import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GuideImageField } from "../components/GuideImageField";
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

function fileDataTransfer(file: File) {
  return {
    types: ["Files"],
    dropEffect: "",
    files: [file],
  };
}

describe("GuideImageField", () => {
  beforeEach(() => {
    mockWriteImageFile.mockReset();
    mockWriteImageFile.mockResolvedValue("./images/foo.jpg");
  });

  it("uploads an image and calls onChange with the relative path", async () => {
    const onChange = vi.fn();
    const directory = new FakeDirectoryHandle("guide").asDirectoryHandle();

    render(
      <GuideImageField
        directory={directory}
        label="Hero image"
        onChange={onChange}
      />,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["image"], "hero.jpg", { type: "image/jpeg" });

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(mockWriteImageFile).toHaveBeenCalledWith(directory, file);
      expect(onChange).toHaveBeenCalledWith("./images/foo.jpg");
    });
  });

  it("rejects non-image files", async () => {
    const onChange = vi.fn();
    const directory = new FakeDirectoryHandle("guide").asDirectoryHandle();

    render(
      <GuideImageField
        directory={directory}
        label="Hero image"
        onChange={onChange}
      />,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["video"], "clip.mp4", { type: "video/mp4" });

    await userEvent.upload(input, file);

    expect(mockWriteImageFile).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("uploads an image when a file is dropped on the upload target", async () => {
    const onChange = vi.fn();
    const directory = new FakeDirectoryHandle("guide").asDirectoryHandle();
    const file = new File(["image"], "thumb.jpg", { type: "image/jpeg" });

    render(
      <GuideImageField
        directory={directory}
        label="Thumbnail"
        onChange={onChange}
      />,
    );

    const uploadTarget = screen.getByRole("button", { name: "Upload thumbnail" });
    const dataTransfer = fileDataTransfer(file);
    fireEvent.dragOver(uploadTarget, { dataTransfer });
    fireEvent.drop(uploadTarget, { dataTransfer });

    await waitFor(() => {
      expect(mockWriteImageFile).toHaveBeenCalledWith(directory, file);
      expect(onChange).toHaveBeenCalledWith("./images/foo.jpg");
    });
  });

  it("rejects non-image files dropped on the upload target", async () => {
    const onChange = vi.fn();
    const directory = new FakeDirectoryHandle("guide").asDirectoryHandle();
    const file = new File(["video"], "clip.mp4", { type: "video/mp4" });

    render(
      <GuideImageField
        directory={directory}
        label="Thumbnail"
        onChange={onChange}
      />,
    );

    const uploadTarget = screen.getByRole("button", { name: "Upload thumbnail" });
    fireEvent.drop(uploadTarget, { dataTransfer: fileDataTransfer(file) });

    expect(mockWriteImageFile).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("replaces an image when a file is dropped on the preview", async () => {
    const onChange = vi.fn();
    const directory = new FakeDirectoryHandle("guide").asDirectoryHandle();
    const file = new File(["image"], "new.jpg", { type: "image/jpeg" });

    render(
      <GuideImageField
        directory={directory}
        label="Thumbnail"
        src="./images/old.jpg"
        onChange={onChange}
      />,
    );

    const replaceTarget = screen.getByRole("button", { name: "Replace thumbnail" });
    fireEvent.drop(replaceTarget, { dataTransfer: fileDataTransfer(file) });

    await waitFor(() => {
      expect(mockWriteImageFile).toHaveBeenCalledWith(directory, file);
      expect(onChange).toHaveBeenCalledWith("./images/foo.jpg");
    });
  });

  it("clears the image when Remove is clicked", async () => {
    const onChange = vi.fn();
    const directory = new FakeDirectoryHandle("guide").asDirectoryHandle();

    render(
      <GuideImageField
        directory={directory}
        label="Hero image"
        src="https://example.com/hero.jpg"
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
