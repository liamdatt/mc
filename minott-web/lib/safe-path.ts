/**
 * Same-origin relative-path validator shared by flows that round-trip a
 * `next` path through a form or query param (portal sign-in, preview unlock).
 * Returns the path only when it is safe to redirect to: must start with a
 * single "/", and must not contain backslashes or control characters
 * ("//host" and a backslash-path are open redirects, and browsers strip
 * control characters from URLs, which would turn a tab-separated
 * "/<TAB>/host" into "//host"). Anything else → undefined.
 */
export function safeRelativePath(
  next: string | null | undefined,
): string | undefined {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return undefined;
  }
  for (let i = 0; i < next.length; i++) {
    const code = next.charCodeAt(i);
    // control chars (< 0x20), DEL (0x7f), and backslash (0x5c)
    if (code < 0x20 || code === 0x7f || code === 0x5c) return undefined;
  }
  return next;
}
