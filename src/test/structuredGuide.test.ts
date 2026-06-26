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

  it("round-trips a button bullet through LinkButton MDX", async () => {
    const parsed = parseStructuredGuide(blankGuideMdx);
    expect(parsed.status).toBe("supported");
    if (parsed.status !== "supported") {
      return;
    }

    parsed.draft.steps[0].bullets = [
      {
        id: "b1",
        variant: "button",
        color: "GREY",
        body: "",
        links: [
          {
            id: "l1",
            label: "Download 3MF",
            href: "./files/model.3mf",
            download: true,
          },
          {
            id: "l2",
            label: "Download STL",
            href: "./files/model.stl",
            download: "model.stl",
          },
          {
            id: "l3",
            label: "View online",
            href: "https://example.com",
            external: true,
          },
        ],
      },
    ];

    const source = serializeGuideLayout(parsed.draft);
    expect(source).toContain('<GuideStep.Bullet variant="button">');
    expect(source).toContain(
      '<LinkButton.Item href="./files/model.3mf" download>Download 3MF</LinkButton.Item>',
    );
    expect(source).toContain(
      '<LinkButton.Item href="./files/model.stl" download="model.stl">Download STL</LinkButton.Item>',
    );
    expect(source).toContain(
      '<LinkButton.Item href="https://example.com" external>View online</LinkButton.Item>',
    );
    await expect(compileGuideMdx(source)).resolves.toEqual({
      Content: expect.any(Function),
    });

    const reparsed = parseStructuredGuide(source);
    expect(reparsed.status).toBe("supported");
    if (reparsed.status !== "supported") {
      return;
    }
    const bullet = reparsed.draft.steps[0].bullets[0];
    expect(bullet.variant).toBe("button");
    expect(bullet.links).toEqual([
      expect.objectContaining({
        label: "Download 3MF",
        href: "./files/model.3mf",
        download: true,
      }),
      expect.objectContaining({
        label: "Download STL",
        href: "./files/model.stl",
        download: "model.stl",
      }),
      expect.objectContaining({
        label: "View online",
        href: "https://example.com",
        external: true,
      }),
    ]);
  });

  it("treats a button bullet without a LinkButton as unsupported", () => {
    const source = blankGuideMdx.replace(
      "          <GuideStep.Bullet>\n            Replace this placeholder instruction with the first action.\n          </GuideStep.Bullet>",
      '          <GuideStep.Bullet variant="button">\n            Just text, no button.\n          </GuideStep.Bullet>',
    );

    expect(parseStructuredGuide(source)).toMatchObject({
      status: "unsupported",
      reason: expect.stringContaining("LinkButton"),
    });
  });

  it("round-trips MediaFigure annotations of every shape", async () => {
    const parsed = parseStructuredGuide(blankGuideMdx);
    expect(parsed.status).toBe("supported");
    if (parsed.status !== "supported") {
      return;
    }

    parsed.draft.steps[0].media = [
      {
        id: "m1",
        src: "./images/one.jpg",
        annotations: [
          { id: "a1", type: "point", x: 25, y: 30, color: "RED", label: 1, title: "Pry point" },
          { id: "a2", type: "circle", x: 60, y: 45, radius: 12, color: "ORANGE" },
          { id: "a3", type: "rectangle", x1: 10, y1: 20, x2: 40, y2: 55, color: "LIGHT_BLUE" },
        ],
      },
    ];

    const source = serializeGuideLayout(parsed.draft);
    expect(source).toContain("annotations={[");
    expect(source).toContain(
      '{ type: "point", x: 25, y: 30, label: 1, color: "RED", title: "Pry point" }',
    );
    await expect(compileGuideMdx(source)).resolves.toEqual({
      Content: expect.any(Function),
    });

    const reparsed = parseStructuredGuide(source);
    expect(reparsed.status).toBe("supported");
    if (reparsed.status !== "supported") {
      return;
    }
    expect(reparsed.draft.steps[0].media[0].annotations).toEqual([
      expect.objectContaining({ type: "point", x: 25, y: 30, color: "RED", label: 1, title: "Pry point" }),
      expect.objectContaining({ type: "circle", x: 60, y: 45, radius: 12, color: "ORANGE" }),
      expect.objectContaining({ type: "rectangle", x1: 10, y1: 20, x2: 40, y2: 55, color: "LIGHT_BLUE" }),
    ]);
  });

  it("treats an empty annotations array as supported with no markers", () => {
    const source = blankGuideMdx.replace(
      '<MediaFigure src="./images/placeholder.jpg" />',
      '<MediaFigure src="./images/placeholder.jpg" annotations={[]} />',
    );

    const parsed = parseStructuredGuide(source);
    expect(parsed.status).toBe("supported");
    if (parsed.status !== "supported") {
      return;
    }
    expect(parsed.draft.steps[0].media[0].annotations).toBeUndefined();
  });

  it("routes a non-literal annotations expression to raw MDX", () => {
    const source = blankGuideMdx.replace(
      '<MediaFigure src="./images/placeholder.jpg" />',
      "<MediaFigure src=\"./images/placeholder.jpg\" annotations={buildAnnotations()} />",
    );

    expect(parseStructuredGuide(source)).toMatchObject({
      status: "unsupported",
      reason: expect.stringContaining("Raw MDX"),
    });
  });

  it("round-trips a MediaFigure displayRegion", async () => {
    const parsed = parseStructuredGuide(blankGuideMdx);
    expect(parsed.status).toBe("supported");
    if (parsed.status !== "supported") {
      return;
    }

    parsed.draft.steps[0].media = [
      { id: "m1", src: "./images/one.jpg", displayRegion: { x: 320, y: 90, width: 640 } },
    ];

    const source = serializeGuideLayout(parsed.draft);
    expect(source).toContain("displayRegion={{ x: 320, y: 90, width: 640 }}");
    await expect(compileGuideMdx(source)).resolves.toEqual({
      Content: expect.any(Function),
    });

    const reparsed = parseStructuredGuide(source);
    expect(reparsed.status).toBe("supported");
    if (reparsed.status !== "supported") {
      return;
    }
    expect(reparsed.draft.steps[0].media[0].displayRegion).toEqual({
      x: 320,
      y: 90,
      width: 640,
    });
  });

  it("round-trips a displayRegion alongside annotations", () => {
    const parsed = parseStructuredGuide(blankGuideMdx);
    expect(parsed.status).toBe("supported");
    if (parsed.status !== "supported") {
      return;
    }

    parsed.draft.steps[0].media = [
      {
        id: "m1",
        src: "./images/one.jpg",
        displayRegion: { x: 10, y: 20, width: 800 },
        annotations: [{ id: "a1", type: "point", x: 50, y: 50, label: 1 }],
      },
    ];

    const source = serializeGuideLayout(parsed.draft);
    expect(source).toContain("displayRegion={{ x: 10, y: 20, width: 800 }}");
    expect(source).toContain("annotations={[");

    const reparsed = parseStructuredGuide(source);
    expect(reparsed.status).toBe("supported");
    if (reparsed.status !== "supported") {
      return;
    }
    expect(reparsed.draft.steps[0].media[0]).toMatchObject({
      displayRegion: { x: 10, y: 20, width: 800 },
      annotations: [expect.objectContaining({ type: "point", x: 50, y: 50, label: 1 })],
    });
  });

  it("rounds a fractional displayRegion to whole source pixels", () => {
    const parsed = parseStructuredGuide(blankGuideMdx);
    if (parsed.status !== "supported") {
      expect(parsed.status).toBe("supported");
      return;
    }

    parsed.draft.steps[0].media = [
      { id: "m1", src: "./images/one.jpg", displayRegion: { x: 12.4, y: 8.6, width: 640.5 } },
    ];

    expect(serializeGuideLayout(parsed.draft)).toContain(
      "displayRegion={{ x: 12, y: 9, width: 641 }}",
    );
  });

  it("routes a non-literal displayRegion expression to raw MDX", () => {
    const source = blankGuideMdx.replace(
      '<MediaFigure src="./images/placeholder.jpg" />',
      '<MediaFigure src="./images/placeholder.jpg" displayRegion={computeRegion()} />',
    );

    expect(parseStructuredGuide(source)).toMatchObject({
      status: "unsupported",
      reason: expect.stringContaining("Raw MDX"),
    });
  });

  it("round-trips MediaFigure video and model types", () => {
    const parsed = parseStructuredGuide(blankGuideMdx);
    if (parsed.status !== "supported") {
      expect(parsed.status).toBe("supported");
      return;
    }

    parsed.draft.steps[0].media = [
      { id: "m1", src: "./images/clip.mp4", type: "video" },
      { id: "m2", src: "./images/part.stl", type: "model" },
    ];

    const source = serializeGuideLayout(parsed.draft);
    expect(source).toContain(
      '<MediaFigure\n            src="./images/clip.mp4"\n            type="video"\n          />',
    );
    expect(source).toContain(
      '<MediaFigure\n            src="./images/part.stl"\n            type="model"\n          />',
    );

    const reparsed = parseStructuredGuide(source);
    if (reparsed.status !== "supported") {
      expect(reparsed.status).toBe("supported");
      return;
    }
    expect(reparsed.draft.steps[0].media).toEqual([
      { id: "step-1-media-1", src: "./images/clip.mp4", type: "video" },
      { id: "step-1-media-2", src: "./images/part.stl", type: "model" },
    ]);
  });

  it("round-trips tool list item thumbnails", () => {
    const source = blankGuideMdx.replace(
      '<ToolList.Item name="Add a required tool" quantity={1} />',
      '<ToolList.Item name="Screwdriver" quantity={1} thumbnail="./images/screwdriver.jpg" />',
    );

    const parsed = parseStructuredGuide(source);
    expect(parsed.status).toBe("supported");
    if (parsed.status !== "supported") {
      return;
    }

    expect(parsed.draft.toolLists[0].items[0]).toMatchObject({
      name: "Screwdriver",
      quantity: 1,
      thumbnail: "./images/screwdriver.jpg",
    });

    const serialized = serializeGuideLayout(parsed.draft);
    expect(serialized).toContain('thumbnail="./images/screwdriver.jpg"');

    const reparsed = parseStructuredGuide(serialized);
    expect(reparsed.status).toBe("supported");
    if (reparsed.status !== "supported") {
      return;
    }

    expect(reparsed.draft.toolLists[0].items[0].thumbnail).toBe(
      "./images/screwdriver.jpg",
    );
  });

  it("round-trips header hero image and alt text", () => {
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
    heroImageAlt="Assembled trackers on a dock"
    difficulty="easy"
    timeEstimate="30 minutes"
    meta="Draft"
  />`,
    );

    const parsed = parseStructuredGuide(source);
    expect(parsed.status).toBe("supported");
    if (parsed.status !== "supported") {
      return;
    }

    expect(parsed.draft.header).toMatchObject({
      heroImage: "./images/hero.jpg",
      heroImageAlt: "Assembled trackers on a dock",
    });

    const serialized = serializeGuideLayout(parsed.draft);
    expect(serialized).toContain('heroImage="./images/hero.jpg"');
    expect(serialized).toContain('heroImageAlt="Assembled trackers on a dock"');

    const reparsed = parseStructuredGuide(serialized);
    expect(reparsed.status).toBe("supported");
    if (reparsed.status !== "supported") {
      return;
    }

    expect(reparsed.draft.header.heroImage).toBe("./images/hero.jpg");
    expect(reparsed.draft.header.heroImageAlt).toBe(
      "Assembled trackers on a dock",
    );
  });
});
