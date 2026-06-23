import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import {
  compileGuideMdx,
  formatMdxError,
  stripGuideUiImports,
} from "../lib/mdx/guideMdx";
import { blankGuideMdx } from "../lib/templates/blankGuideMdx";

describe("guideMdx", () => {
  it("removes the standard guide UI import and preserves other imports", () => {
    const source = `import value from "./local";
import {
  GuideLayout,
  MediaFigure,
} from "@openpawlabs/diy-guides-ui";

<GuideLayout />`;

    const stripped = stripGuideUiImports(source);

    expect(stripped).toContain('import value from "./local";');
    expect(stripped).not.toContain("@openpawlabs/diy-guides-ui");
    expect(stripped).toContain("<GuideLayout />");
  });

  it("compiles the blank guide template", async () => {
    await expect(compileGuideMdx(blankGuideMdx)).resolves.toEqual({
      Content: expect.any(Function),
    });
  });

  it("renders member components from the provided scope", async () => {
    const GuideLayout = Object.assign(
      ({ children }: { children?: ReactNode }) => <section>{children}</section>,
      {
        Header: ({ title }: { title: string }) => <h1>{title}</h1>,
      },
    );
    const { Content } = await compileGuideMdx(
      "<GuideLayout><GuideLayout.Header title=\"Scoped title\" /></GuideLayout>",
    );

    render(<Content components={{ GuideLayout }} />);

    expect(
      screen.getByRole("heading", { name: "Scoped title" }),
    ).toBeInTheDocument();
  });

  it("formats MDX compile errors", async () => {
    try {
      await compileGuideMdx("<GuideLayout");
      throw new Error("Expected MDX compilation to fail.");
    } catch (error) {
      expect(formatMdxError(error)).toContain("Unexpected end of file");
    }
  });
});
