import { describe, expect, it } from "vitest";
import { compileGuideMdx } from "../lib/mdx/guideMdx";
import {
  parseStructuredGuide,
  serializeGuideLayout,
  updateStructuredGuideSource,
} from "../lib/mdx/structuredGuide";
import { blankGuideMdx } from "../lib/templates/blankGuideMdx";

describe("structuredGuide", () => {
  it("parses the blank guide template into a structured draft", () => {
    const parsed = parseStructuredGuide(blankGuideMdx);

    expect(parsed.status).toBe("supported");
    if (parsed.status !== "supported") {
      return;
    }

    expect(parsed.draft.header).toMatchObject({
      title: "Untitled DIY Guide",
      difficulty: "easy",
      timeEstimate: "30 minutes",
      meta: "Draft",
    });
    expect(parsed.draft.toolLists).toHaveLength(1);
    expect(parsed.draft.callouts).toHaveLength(1);
    expect(parsed.draft.steps).toHaveLength(1);
    expect(parsed.draft.steps[0].media).toEqual([
      expect.objectContaining({ src: "./images/placeholder.jpg" }),
    ]);
    expect(parsed.draft.steps[0].bullets[0].body).toContain(
      "Replace this placeholder instruction",
    );
  });

  it("parses up to three images per step", () => {
    const source = blankGuideMdx.replace(
      '<MediaFigure src="./images/placeholder.jpg" />',
      [
        '<MediaFigure src="./images/a.jpg" />',
        '          <MediaFigure src="./images/b.jpg" />',
        '          <MediaFigure src="./images/c.jpg" />',
      ].join("\n"),
    );

    const parsed = parseStructuredGuide(source);
    expect(parsed.status).toBe("supported");
    if (parsed.status !== "supported") {
      return;
    }

    expect(parsed.draft.steps[0].media.map((item) => item.src)).toEqual([
      "./images/a.jpg",
      "./images/b.jpg",
      "./images/c.jpg",
    ]);
  });

  it("treats more than three images per step as unsupported", () => {
    const source = blankGuideMdx.replace(
      '<MediaFigure src="./images/placeholder.jpg" />',
      [
        '<MediaFigure src="./images/a.jpg" />',
        '          <MediaFigure src="./images/b.jpg" />',
        '          <MediaFigure src="./images/c.jpg" />',
        '          <MediaFigure src="./images/d.jpg" />',
      ].join("\n"),
    );

    expect(parseStructuredGuide(source)).toMatchObject({
      status: "unsupported",
      reason: expect.stringContaining("up to"),
    });
  });

  it("serializes structured edits to compilable MDX", async () => {
    const parsed = parseStructuredGuide(blankGuideMdx);
    expect(parsed.status).toBe("supported");
    if (parsed.status !== "supported") {
      return;
    }

    parsed.draft.header.title = "Edited Guide";
    parsed.draft.steps[0].title = "Edited step";
    parsed.draft.steps[0].bullets[0].variant = "caution";
    parsed.draft.steps[0].bullets[0].body = "Watch the cable routing.";

    const source = serializeGuideLayout(parsed.draft);

    expect(source).toContain('title="Edited Guide"');
    expect(source).toContain('variant="caution"');
    await expect(compileGuideMdx(source)).resolves.toEqual({
      Content: expect.any(Function),
    });
  });

  it("patches only the owned GuideLayout block", () => {
    const source = `import LocalThing from "./LocalThing";

${blankGuideMdx}

<LocalThing />`;
    const parsed = parseStructuredGuide(source);
    expect(parsed.status).toBe("supported");
    if (parsed.status !== "supported") {
      return;
    }

    parsed.draft.header.title = "Preserved surrounding MDX";
    const next = updateStructuredGuideSource(source, parsed.draft);

    expect(next).toContain('import LocalThing from "./LocalThing";');
    expect(next).toContain("<LocalThing />");
    expect(next).toContain('title="Preserved surrounding MDX"');
  });

  it("serializes multiple images and an empty media slot", async () => {
    const parsed = parseStructuredGuide(blankGuideMdx);
    expect(parsed.status).toBe("supported");
    if (parsed.status !== "supported") {
      return;
    }

    parsed.draft.steps[0].media = [
      { id: "m1", src: "./images/one.jpg" },
      { id: "m2", src: "./images/two.jpg" },
    ];
    const multiSource = serializeGuideLayout(parsed.draft);
    expect(multiSource).toContain('<MediaFigure src="./images/one.jpg" />');
    expect(multiSource).toContain('<MediaFigure src="./images/two.jpg" />');
    await expect(compileGuideMdx(multiSource)).resolves.toEqual({
      Content: expect.any(Function),
    });

    parsed.draft.steps[0].media = [];
    const emptySource = serializeGuideLayout(parsed.draft);
    expect(emptySource).toContain("<GuideStep.Media />");
    await expect(compileGuideMdx(emptySource)).resolves.toEqual({
      Content: expect.any(Function),
    });
  });

  it("routes MediaFigure annotations to raw MDX", () => {
    const source = blankGuideMdx.replace(
      '<MediaFigure src="./images/placeholder.jpg" />',
      '<MediaFigure src="./images/placeholder.jpg" annotations={[]} />',
    );

    expect(parseStructuredGuide(source)).toMatchObject({
      status: "unsupported",
      reason: expect.stringContaining("annotations"),
    });
  });
});
