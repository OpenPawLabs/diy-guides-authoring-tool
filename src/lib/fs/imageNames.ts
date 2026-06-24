/**
 * Turn an arbitrary uploaded file name into a safe, git-friendly asset name:
 * strip any directory, lowercase, collapse unsafe characters to hyphens, and
 * keep the extension. Falls back to "image" when the stem is empty.
 */
export function sanitizeImageName(rawName: string): string {
  const base = rawName.split(/[\\/]/).pop() ?? rawName;
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot + 1) : "";

  const cleanStem = slug(stem) || "image";
  const cleanExt = slug(ext);

  return cleanExt ? `${cleanStem}.${cleanExt}` : cleanStem;
}

/**
 * Return `name` if it is not already taken, otherwise append `-1`, `-2`, …
 * before the extension until it is unique. Comparison is case-insensitive.
 */
export function uniqueImageName(name: string, existing: Iterable<string>): string {
  const taken = new Set<string>();
  for (const entry of existing) {
    taken.add(entry.toLowerCase());
  }

  if (!taken.has(name.toLowerCase())) {
    return name;
  }

  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";

  let suffix = 1;
  let candidate = `${stem}-${suffix}${ext}`;
  while (taken.has(candidate.toLowerCase())) {
    suffix += 1;
    candidate = `${stem}-${suffix}${ext}`;
  }

  return candidate;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
