import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GuidePreview } from "../components/GuidePreview";
import { blankGuideMdx } from "../lib/templates/blankGuideMdx";
import { FakeFileHandle, readyDirectory } from "./fakeFs";

describe("GuidePreview", () => {
  it("renders tool list thumbnails without recursive render failure", async () => {
    const source = blankGuideMdx.replace(
      '<ToolList.Item name="Add a required tool" quantity={1} />',
      '<ToolList.Item name="Screwdriver" quantity={1} thumbnail="./images/screwdriver.jpg" />',
    );
    const directory = readyDirectory(source);
    const images = directory.directories.get("images")!;
    images.files.set(
      "screwdriver.jpg",
      new FakeFileHandle("screwdriver.jpg", "fake"),
    );

    render(
      <GuidePreview directory={directory.asDirectoryHandle()} source={source} />,
    );

    await waitFor(
      () => {
        expect(
          screen.getByRole("heading", { name: "Untitled DIY Guide" }),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("renders step media from a marked MediaFigure wrapper", async () => {
    const directory = readyDirectory(blankGuideMdx);
    const images = directory.directories.get("images")!;
    images.files.set(
      "placeholder.jpg",
      new FakeFileHandle("placeholder.jpg", "fake"),
    );

    const { container } = render(
      <GuidePreview
        directory={directory.asDirectoryHandle()}
        source={blankGuideMdx}
      />,
    );

    await waitFor(
      () => {
        expect(container.querySelector(".aspect-\\[4\\/3\\] img")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("resolves step gallery thumbnail paths from the guide folder", async () => {
    const source = blankGuideMdx.replace(
      `        <GuideStep.Media>
          <MediaFigure src="./images/placeholder.jpg" />
        </GuideStep.Media>`,
      `        <GuideStep.Media>
          <MediaFigure src="./images/placeholder.jpg" />
          <MediaFigure src="./images/second.jpg" />
        </GuideStep.Media>`,
    );
    const directory = readyDirectory(source);
    const images = directory.directories.get("images")!;
    images.files.set(
      "placeholder.jpg",
      new FakeFileHandle("placeholder.jpg", "fake"),
    );
    images.files.set("second.jpg", new FakeFileHandle("second.jpg", "fake"));

    const { container } = render(
      <GuidePreview directory={directory.asDirectoryHandle()} source={source} />,
    );

    await waitFor(
      () => {
        const thumbnails = container.querySelectorAll(
          "button .aspect-\\[4\\/3\\] img, button .w-16 img",
        );
        expect(thumbnails.length).toBeGreaterThanOrEqual(2);
        for (const thumbnail of thumbnails) {
          expect(thumbnail.getAttribute("src")).toMatch(/^blob:/);
        }
      },
      { timeout: 3000 },
    );
  });

  it("resolves the header hero image without recursive render failure", async () => {
    const source = blankGuideMdx.replace(
      `  <GuideLayout.Header
    title="Untitled DIY Guide"
    difficulty="easy"
    timeEstimate="30 minutes"
    meta="Draft"
  />`,
      `  <GuideLayout.Header
    title="Untitled DIY Guide"
    heroImage="./images/hero.jpg"
    heroImageAlt="Guide hero"
    difficulty="easy"
    timeEstimate="30 minutes"
    meta="Draft"
  />`,
    );
    const directory = readyDirectory(source);
    const images = directory.directories.get("images")!;
    images.files.set("hero.jpg", new FakeFileHandle("hero.jpg", "fake"));

    render(
      <GuidePreview directory={directory.asDirectoryHandle()} source={source} />,
    );

    await waitFor(
      () => {
        const hero = screen.getByRole("img", { name: "Guide hero" });
        expect(hero.getAttribute("src")).toMatch(/^blob:/);
      },
      { timeout: 3000 },
    );
  });

  it("renders LinkButton download bullets from MDX", async () => {
    const source = blankGuideMdx.replace(
      `        <GuideStep.Bullets>
          <GuideStep.Bullet>
            Replace this placeholder instruction with the first action.
          </GuideStep.Bullet>
        </GuideStep.Bullets>`,
      `        <GuideStep.Bullets>
          <GuideStep.Bullet variant="button">
            <LinkButton>
              <LinkButton.Item href="./files/model.stl" download>
                Download STL
              </LinkButton.Item>
            </LinkButton>
          </GuideStep.Bullet>
        </GuideStep.Bullets>`,
    );
    const directory = readyDirectory(source);

    render(
      <GuidePreview directory={directory.asDirectoryHandle()} source={source} />,
    );

    await waitFor(
      () => {
        expect(
          screen.getByRole("link", { name: "Download STL" }),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });
});
