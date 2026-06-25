import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GuideEditor } from "../pages/GuideEditor";
import { GUIDE_MDX } from "../lib/fs/constants";
import { getGuide, putGuide } from "../lib/fs/guideStore";
import type { StepSelection } from "../components/step-editor/StepNavigator";
import { blankGuideMdx } from "../lib/templates/blankGuideMdx";
import { FakeDirectoryHandle, readyDirectory } from "./fakeFs";
import { resetIndexedDb } from "./resetIndexedDb";

vi.mock("../components/GuidePreview", () => ({
  GuidePreview: ({ source }: { source: string }) => (
    <div data-testid="guide-preview">{source}</div>
  ),
}));

beforeEach(resetIndexedDb);

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

  it("adds and removes bullets in a structured step", async () => {
    const directory = readyDirectory(blankGuideMdx);
    renderEditor("bullets-guide", directory);

    await userEvent.click(await screen.findByRole("tab", { name: "1" }));

    // A single bullet exposes no remove control.
    expect(
      screen.queryByRole("button", { name: "Remove bullet" }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /new bullet/i }));
    expect(
      screen.getAllByRole("button", { name: "Remove bullet" }),
    ).toHaveLength(2);

    await userEvent.click(
      screen.getAllByRole("button", { name: "Remove bullet" })[1],
    );
    expect(
      screen.queryByRole("button", { name: "Remove bullet" }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      const content = directory.files.get(GUIDE_MDX)?.content ?? "";
      expect(content.match(/<GuideStep\.Bullet[ >]/g) ?? []).toHaveLength(1);
      expect(screen.getByText("Saved")).toBeInTheDocument();
    });
  });

  it("confirms before removing a step", async () => {
    const directory = readyDirectory(blankGuideMdx);
    renderEditor("remove-step-guide", directory);

    // Add a second step so removal is enabled, then target it.
    await userEvent.click(await screen.findByRole("button", { name: /add step/i }));
    expect(screen.getByRole("tab", { name: "2" })).toBeInTheDocument();

    // Opening the confirm modal must not remove the step on its own; cancelling
    // is a no-op.
    await userEvent.click(screen.getByRole("button", { name: "Remove step" }));
    expect(screen.getByText("Remove this step?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("tab", { name: "2" })).toBeInTheDocument();

    // Confirming removes it.
    await userEvent.click(screen.getByRole("button", { name: "Remove step" }));
    const dialog = screen.getByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove step" }));
    await waitFor(() =>
      expect(screen.queryByRole("tab", { name: "2" })).not.toBeInTheDocument(),
    );
  });

  it("switches between the Overview tab and a step", async () => {
    const directory = readyDirectory(blankGuideMdx);
    renderEditor("tabs-guide", directory);

    expect(await screen.findByLabelText("Intro content")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "1" }));

    expect(screen.queryByLabelText("Intro content")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove step" })).toBeInTheDocument();
  });

  it("reopens the persisted step instead of Overview on load", async () => {
    const directory = readyDirectory(blankGuideMdx);
    renderEditor("restore-guide", directory, { initialStep: 0 });

    expect(
      await screen.findByRole("button", { name: "Remove step" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Intro content")).not.toBeInTheDocument();
  });

  it("persists the active step to the recents entry when it changes", async () => {
    const directory = readyDirectory(blankGuideMdx);
    await putGuide({
      id: "persist-guide",
      handle: directory.asDirectoryHandle(),
      folderName: directory.name,
      lastOpenedAt: 1,
    });
    renderEditor("persist-guide", directory);

    await userEvent.click(await screen.findByRole("tab", { name: "1" }));
    await waitFor(async () => {
      expect((await getGuide("persist-guide"))?.lastStep).toBe(0);
    });

    await userEvent.click(screen.getByRole("tab", { name: "Overview" }));
    await waitFor(async () => {
      expect((await getGuide("persist-guide"))?.lastStep).toBe("overview");
    });
  });

  it("opens the dedicated preview tab", async () => {
    const directory = readyDirectory(blankGuideMdx);
    renderEditor("preview-tab-guide", directory);

    expect(screen.queryByTestId("guide-preview")).not.toBeInTheDocument();

    await userEvent.click(await screen.findByRole("button", { name: "Preview" }));

    expect(screen.getByTestId("guide-preview")).toBeInTheDocument();
    expect(screen.queryByLabelText("MDX source")).not.toBeInTheDocument();
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
  overrides: { onClose?: () => void; initialStep?: StepSelection } = {},
) {
  return render(
    <GuideEditor
      guideId={guideId}
      directory={directory.asDirectoryHandle()}
      guide={guideStatus(directory)}
      initialStep={overrides.initialStep}
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
