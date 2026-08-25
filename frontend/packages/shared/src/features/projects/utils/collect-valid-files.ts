// Client-side upload gate (§5). The Add Knowledge dialog — NOT the input's
// `accept` — is the authoritative validator: a drag-drop or a programmatic
// `change` bypasses `accept`, so type/size/count are all re-checked here.
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 5;
const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".xlsx"] as const;

// Identity of a picked file: same name + size + mtime ⇒ the same physical file.
// This is BOTH the dedupe key here and the React list key in the dialog — one
// function so the two can never drift (a mismatch is what lets a duplicate slip
// past dedupe yet collide as a React key).
export function fileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

// A rejected file, described structurally so the React boundary can localize
// the toast — the pure validator stays i18n-free (方案 C: no translator here).
export type FileRejection =
  | { reason: "unsupportedType"; filename: string }
  | { reason: "tooLarge"; filename: string }
  | { reason: "tooMany" };

/**
 * Pure file validator: walks `incoming` in order applying the dedupe → type →
 * size → count gates, returning the accepted files plus an ordered list of
 * per-file rejections (reason + filename) for the caller to localize. Files
 * already in `existing` (or repeated within the batch) are skipped SILENTLY —
 * re-picking a file is not an error. Dedupe runs before the count gate so a
 * duplicate never consumes a slot, and the running counter seeds from
 * `existing.length` so a batch can't exceed MAX_FILES across calls.
 */
export function collectValidFiles(
  incoming: File[],
  existing: File[],
): { accepted: File[]; rejections: FileRejection[] } {
  const accepted: File[] = [];
  const rejections: FileRejection[] = [];
  const seen = new Set(existing.map(fileKey));
  let count = existing.length;
  for (const file of incoming) {
    if (seen.has(fileKey(file))) {
      continue;
    }
    const lower = file.name.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      rejections.push({ reason: "unsupportedType", filename: file.name });
      continue;
    }
    if (file.size > MAX_FILE_BYTES) {
      rejections.push({ reason: "tooLarge", filename: file.name });
      continue;
    }
    if (count >= MAX_FILES) {
      rejections.push({ reason: "tooMany" });
      continue;
    }
    accepted.push(file);
    seen.add(fileKey(file));
    count += 1;
  }
  return { accepted, rejections };
}
