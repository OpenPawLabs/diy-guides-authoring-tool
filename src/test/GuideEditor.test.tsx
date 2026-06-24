import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GuideEditor } from "../pages/GuideEditor";
import { GUIDE_DB, GUIDE_MDX } from "../lib/fs/constants";
import { blankGuideMdx } from "../lib/templates/blankGuideMdx";
import { FakeDirectoryHandle, readyDirectory } from "./fakeFs";

vi.mock("../components/GuidePreview", () => ({
  GuidePreview: ({ source }: { source: string }) => (
    <div data-testid="guide-preview">{source}</div>
  ),
}));

beforeEach(deleteDatabase);

describe("GuideEditor", () => {
  it("loads, edits, and saves guide.mdx through raw mode", async () => {
    const directory = readyDirectory("# Initial");
    renderEditor("raw-guide", directory);

    await userEvent.click(await screen.findByRole("button", { name: "Raw MDX" }));

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

  it("edits and saves a structured guide", async () => {
    const directory = readyDirectory(blankGuideMdx);
    renderEditor("structured-guide", directory);

    const title = await screen.findByLabelText("Title");
    fireEvent.change(title, { target: { value: "Edited Structured Guide" } });

    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Save guide.mdx" }));

    await waitFor(() => {
      expect(directory.files.get(GUIDE_MDX)?.content).toContain(
        'title="Edited Structured Guide"',
      );
      expect(screen.getByText("Saved")).toBeInTheDocument();
    });
  });

  it("opens raw mode directly when structured editing cannot parse the document", async () => {
    const directory = readyDirectory("# Initial");
    renderEditor("unsupported-guide", directory);

    expect(
      await screen.findByText("Structured editing is not available for this MDX"),
    ).toBeInTheDocument();
    expect(await screen.findByLabelText("MDX source")).toHaveValue("# Initial");
  });

  it("returns to the guides list", async () => {
    const directory = readyDirectory("# Initial");
    const onClose = vi.fn();
    renderEditor("close-guide", directory, { onClose });

    await userEvent.click(await screen.findByRole("button", { name: "Back to guides" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

function renderEditor(
  guideId: string,
  directory: FakeDirectoryHandle,
  overrides: { onClose?: () => void } = {},
) {
  return render(
    <GuideEditor
      guideId={guideId}
      directory={directory.asDirectoryHandle()}
      guide={guideStatus(directory)}
      onClose={overrides.onClose ?? vi.fn()}
      onPermissionLost={vi.fn()}
    />,
  );
}

function guideStatus(directory: FakeDirectoryHandle) {
  return {
    folderName: directory.name,
    guideMdxExists: true as const,
    imagesDirExists: true,
    guideMdxLastModified: 1,
    guideMdxSize: directory.files.get(GUIDE_MDX)?.content.length ?? 0,
  };
}

function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(GUIDE_DB);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("IndexedDB delete was blocked."));
    request.onsuccess = () => resolve();
  });
}
