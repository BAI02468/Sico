// 16 MiB cap. Reject when `file.size >` this, so exactly 16 MiB passes.
// User-facing copy rounds to "16 MB" (collab.composer.file.tooLarge).
export const MAX_ATTACHMENT_BYTES = 16 * 1024 * 1024;
