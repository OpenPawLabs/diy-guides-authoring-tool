import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
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
