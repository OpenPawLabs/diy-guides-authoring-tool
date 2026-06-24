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

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(directory.files.get(GUIDE_MDX)?.content).toBe("# Edited");
      expect(screen.getByText("Saved")).toBeInTheDocument();
    });
  });

  it("discards edits after confirming the change preview", async () => {
    const directory = readyDirectory("# Initial");
    renderEditor("discard-guide", directory);

    await userEvent.click(await screen.findByRole("button", { name: "Raw MDX" }));

    const editor = await screen.findByLabelText("MDX source");
    fireEvent.change(editor, { target: { value: "# Edited" } });
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(screen.getByText("Discard unsaved changes?")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Discard changes" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Saved")).toBeInTheDocument();
      expect(screen.getByLabelText("MDX source")).toHaveValue("# Initial");
    });
    expect(directory.files.get(GUIDE_MDX)?.content).toBe("# Initial");
  });

  it("edits and saves a structured guide", async () => {
    const directory = readyDirectory(blankGuideMdx);
    renderEditor("structured-guide", directory);

    const title = await screen.findByLabelText("Title");
    fireEvent.change(title, { target: { value: "Edited Structured Guide" } });

    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(directory.files.get(GUIDE_MDX)?.content).toContain(
        'title="Edited Structured Guide"',
      );
      expect(screen.getByText("Saved")).toBeInTheDocument();
    });
  });

  it("edits guide-level details from the Overview tab", async () => {
    const directory = readyDirectory(blankGuideMdx);
    renderEditor("overview-guide", directory);

    const intro = await screen.findByLabelText("Intro content");
    fireEvent.change(intro, { target: { value: "A fresh intro." } });

    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(directory.files.get(GUIDE_MDX)?.content).toContain("A fresh intro.");
    });
  });

  it("converts a bullet into a download button and saves LinkButton MDX", async () => {
    const directory = readyDirectory(blankGuideMdx);
    renderEditor("button-bullet-guide", directory);

    await userEvent.click(await screen.findByRole("tab", { name: "1" }));

    await userEvent.click(
      screen.getByRole("button", { name: "Change bullet style" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Button" }));

    expect(
      screen.getByRole("button", { name: "More download options" }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      const content = directory.files.get(GUIDE_MDX)?.content ?? "";
      expect(content).toContain('<GuideStep.Bullet variant="button">');
      expect(content).toContain("<LinkButton>");
    });
  });

  it("switches between the Overview tab and a step", async () => {
    const directory = readyDirectory(blankGuideMdx);
    renderEditor("tabs-guide", directory);

    expect(await screen.findByLabelText("Intro content")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "1" }));

    expect(screen.queryByLabelText("Intro content")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove step" })).toBeInTheDocument();
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
