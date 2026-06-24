import { describe, expect, it } from "vitest";
import { diffHunks, diffLines } from "../lib/diff";

describe("diffLines", () => {
  it("marks added, removed, and unchanged lines", () => {
    const result = diffLines("a\nb\nc", "a\nB\nc");
    expect(result).toEqual([
      { op: "context", text: "a" },
      { op: "removed", text: "b" },
      { op: "added", text: "B" },
      { op: "context", text: "c" },
    ]);
  });

  it("treats a pure insertion as added lines only", () => {
    const result = diffLines("a\nc", "a\nb\nc");
    expect(result.filter((line) => line.op === "removed")).toHaveLength(0);
    expect(result).toContainEqual({ op: "added", text: "b" });
  });
});

describe("diffHunks", () => {
  it("returns no hunks for identical sources", () => {
    expect(diffHunks("same\ntext", "same\ntext")).toEqual([]);
  });

  it("collapses unchanged regions into separate hunks", () => {
    const before = Array.from({ length: 20 }, (_, i) => `line ${i}`).join("\n");
    const after = before
      .replace("line 1", "line 1 edited")
      .replace("line 18", "line 18 edited");

    const hunks = diffHunks(before, after, 1);

    expect(hunks).toHaveLength(2);
    expect(hunks[0].lines).toContainEqual({ op: "added", text: "line 1 edited" });
    expect(hunks[1].lines).toContainEqual({ op: "added", text: "line 18 edited" });
    // The long unchanged middle is dropped, not rendered as one giant hunk.
    expect(hunks[0].lines.some((line) => line.text === "line 10")).toBe(false);
  });

  it("surfaces an added image source line as an addition", () => {
    const before = '<MediaFigure />';
    const after = '<MediaFigure src="./images/new.png" />';
    const hunks = diffHunks(before, after);
    const ops = hunks.flatMap((hunk) => hunk.lines.map((line) => line.op));
    expect(ops).toContain("added");
    expect(ops).toContain("removed");
  });
});
