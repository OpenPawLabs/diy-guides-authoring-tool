/**
 * Stable content hash for a `guide.mdx` snapshot. Used to detect whether the
 * file on disk changed underneath an in-progress edit so the editor can offer a
 * conflict choice instead of silently overwriting newer content.
 */
export async function hashSource(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
