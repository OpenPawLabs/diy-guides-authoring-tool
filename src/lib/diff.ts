/**
 * Minimal line-level diff used to show authors exactly what their unsaved edits
 * change before they discard them. MDX is the source of truth, so diffing the
 * serialized current source against the on-disk source captures every change —
 * edited text, added/removed bullets, swapped image paths — in one honest view.
 */

export type DiffOp = "context" | "added" | "removed";

export interface DiffLine {
  op: DiffOp;
  text: string;
}

export interface DiffHunk {
  lines: DiffLine[];
}

/** Longest-common-subsequence line diff (O(n*m), fine for a single guide.mdx). */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const n = a.length;
  const m = b.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      lines.push({ op: "context", text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      lines.push({ op: "removed", text: a[i] });
      i++;
    } else {
      lines.push({ op: "added", text: b[j] });
      j++;
    }
  }
  while (i < n) lines.push({ op: "removed", text: a[i++] });
  while (j < m) lines.push({ op: "added", text: b[j++] });
  return lines;
}

/**
 * Group a line diff into hunks of changed lines surrounded by up to `context`
 * unchanged lines, collapsing long unchanged stretches. Returns an empty array
 * when the two sources are identical.
 */
export function diffHunks(before: string, after: string, context = 3): DiffHunk[] {
  const lines = diffLines(before, after);
  if (lines.every((line) => line.op === "context")) {
    return [];
  }

  const keep = new Array<boolean>(lines.length).fill(false);
  lines.forEach((line, index) => {
    if (line.op === "context") return;
    const start = Math.max(0, index - context);
    const end = Math.min(lines.length - 1, index + context);
    for (let k = start; k <= end; k++) keep[k] = true;
  });

  const hunks: DiffHunk[] = [];
  let current: DiffLine[] | null = null;
  lines.forEach((line, index) => {
    if (!keep[index]) {
      current = null;
      return;
    }
    if (!current) {
      current = [];
      hunks.push({ lines: current });
    }
    current.push(line);
  });
  return hunks;
}
