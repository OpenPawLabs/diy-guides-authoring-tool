import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { HomePage } from "../pages/HomePage";
import { listGuides, putDraft, putGuide } from "../lib/fs/guideStore";
import { resetIndexedDb } from "./resetIndexedDb";

beforeEach(resetIndexedDb);

async function seedGuide() {
  await putGuide({
    id: "forget-me",
    handle: {} as FileSystemDirectoryHandle,
    folderName: "0-overview",
    title: "Overview",
    lastOpenedAt: 1,
  });
}

async function seedDraft() {
  await putDraft({
    guideId: "forget-me",
    mode: "raw",
    rawSource: "# Edited",
    baseSource: "# Base",
    baseHash: "hash",
    updatedAt: 1,
  });
}

describe("HomePage forget confirmation", () => {
  it("confirms before forgetting a guide and its draft", async () => {
    await seedGuide();
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    await userEvent.click(
      await screen.findByRole("button", {
        name: /Remove 0-overview from recents/,
      }),
    );
    expect(
      screen.getByText("Remove this guide from recents?"),
    ).toBeInTheDocument();

    // Cancelling keeps the guide in the store and the list.
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await listGuides()).toHaveLength(1);
    expect(screen.getByText("Overview")).toBeInTheDocument();

    // Confirming removes it.
    await userEvent.click(
      screen.getByRole("button", { name: /Remove 0-overview from recents/ }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Remove from recents" }),
    );

    await waitFor(async () => expect(await listGuides()).toHaveLength(0));
    await waitFor(() =>
      expect(screen.queryByText("Overview")).not.toBeInTheDocument(),
    );
  });

  it("omits the edit warning when the guide has no draft", async () => {
    await seedGuide();
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    await userEvent.click(
      await screen.findByRole("button", {
        name: /Remove 0-overview from recents/,
      }),
    );

    expect(screen.getByText("guide.mdx")).toBeInTheDocument();
    expect(
      screen.queryByText(/discards any unsaved edits/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/unsaved edits that will be permanently deleted/),
    ).not.toBeInTheDocument();
  });

  it("warns about unsaved edits when the guide has a draft", async () => {
    await seedGuide();
    await seedDraft();
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    await userEvent.click(
      await screen.findByRole("button", {
        name: /Remove 0-overview from recents/,
      }),
    );

    expect(
      screen.getByText(/discards any unsaved edits stored for it/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/unsaved edits that will be permanently deleted/),
    ).toBeInTheDocument();
  });
});
