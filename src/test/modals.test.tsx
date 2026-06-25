import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmModal } from "../components/ConfirmModal";
import { DiscardChangesModal } from "../components/DiscardChangesModal";
import { DiskConflictModal } from "../components/DiskConflictModal";
import { FolderAccessModal } from "../components/FolderAccessModal";

describe("FolderAccessModal", () => {
  it("shows the folder name and wires the access actions", async () => {
    const onAllowAccess = vi.fn();
    const onCancel = vi.fn();

    render(
      <FolderAccessModal
        isOpen
        folderName="2-tracker-assembly"
        onAllowAccess={onAllowAccess}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText(/2-tracker-assembly/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Allow Access" }));
    expect(onAllowAccess).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "Back to guides" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe("DiskConflictModal", () => {
  it("offers keep and reload choices", async () => {
    const onKeepEdits = vi.fn();
    const onReloadFromDisk = vi.fn();

    render(
      <DiskConflictModal
        isOpen
        onKeepEdits={onKeepEdits}
        onReloadFromDisk={onReloadFromDisk}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Keep my edits" }));
    expect(onKeepEdits).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "Reload from disk" }));
    expect(onReloadFromDisk).toHaveBeenCalledTimes(1);
  });
});

describe("DiscardChangesModal", () => {
  it("shows the line-level changes and wires the actions", async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(
      <DiscardChangesModal
        isOpen
        before={'title="Old"'}
        after={'title="New"'}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText(/title="Old"/)).toBeInTheDocument();
    expect(screen.getByText(/title="New"/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("reports when there is nothing to discard", () => {
    render(
      <DiscardChangesModal
        isOpen
        before="same"
        after="same"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByText("No differences from the file on disk."),
    ).toBeInTheDocument();
  });
});

describe("ConfirmModal", () => {
  it("renders the heading and body and wires the actions", async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(
      <ConfirmModal
        isOpen
        heading="Remove this step?"
        body={<p>This deletes its bullets.</p>}
        confirmLabel="Remove step"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText("Remove this step?")).toBeInTheDocument();
    expect(screen.getByText("This deletes its bullets.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "Remove step" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
