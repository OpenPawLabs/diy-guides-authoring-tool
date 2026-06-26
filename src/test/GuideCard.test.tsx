import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { GuideCard } from "../components/GuideCard";
import type { StoredGuide } from "../lib/fs/guideStore";

const guide: StoredGuide = {
  id: "abc",
  handle: {} as FileSystemDirectoryHandle,
  folderName: "2-tracker-assembly",
  title: "Tracker Assembly",
  difficulty: "moderate",
  lastOpenedAt: 1,
  lastSavedAt: Date.now(),
};

function renderCard(props: Partial<Parameters<typeof GuideCard>[0]> = {}) {
  return render(
    <MemoryRouter>
      <GuideCard guide={guide} {...props} />
    </MemoryRouter>,
  );
}

describe("GuideCard", () => {
  it("shows the guide title, folder, and difficulty, and links to its route", () => {
    renderCard();

    expect(screen.getByText("Tracker Assembly")).toBeInTheDocument();
    expect(screen.getByText("2-tracker-assembly")).toBeInTheDocument();
    expect(screen.getByText("Moderate")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/guide/abc");
    expect(
      screen.getByRole("button", { name: "Full preview of Tracker Assembly" }),
    ).toBeInTheDocument();
  });

  it("opens full preview in a new tab", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    renderCard();

    await userEvent.click(
      screen.getByRole("button", { name: "Full preview of Tracker Assembly" }),
    );

    expect(openSpy).toHaveBeenCalledWith(
      expect.stringMatching(/#\/guide\/abc\/preview$/),
      "_blank",
      "noopener,noreferrer",
    );
    openSpy.mockRestore();
  });

  it("shows an unsaved warning on the full preview button", () => {
    renderCard({ hasPendingEdits: true });

    expect(
      screen.getByRole("button", {
        name: "Full preview (saved) of Tracker Assembly",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Unsaved edits not shown")).toBeInTheDocument();
  });

  it("falls back to the folder name when there is no title", () => {
    render(
      <MemoryRouter>
        <GuideCard guide={{ ...guide, title: undefined }} />
      </MemoryRouter>,
    );

    // Folder name appears as both the title and the description.
    expect(screen.getAllByText("2-tracker-assembly")).toHaveLength(2);
  });

  it("forgets a guide without navigating", async () => {
    const onForget = vi.fn();
    renderCard({ onForget });

    await userEvent.click(
      screen.getByRole("button", { name: /Remove 2-tracker-assembly from recents/ }),
    );

    expect(onForget).toHaveBeenCalledWith("abc");
  });
});
