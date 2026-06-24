import { describe, expect, it } from "vitest";
import { hashSource } from "../lib/fs/hash";

describe("hashSource", () => {
  it("is stable for identical input", async () => {
    await expect(hashSource("# Guide")).resolves.toBe(await hashSource("# Guide"));
  });

  it("differs when the content changes", async () => {
    expect(await hashSource("# Guide")).not.toBe(await hashSource("# Guide!"));
  });

  it("returns a 64-character hex digest", async () => {
    expect(await hashSource("anything")).toMatch(/^[0-9a-f]{64}$/);
  });
});
