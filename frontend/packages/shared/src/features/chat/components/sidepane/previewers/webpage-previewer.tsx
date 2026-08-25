import { useLingui } from "@lingui/react/macro";
import { Globe } from "lucide-react";
import type { JSX } from "react";

import { SandboxedIframe } from "../../../../file-preview/components/sandboxed-iframe";
import type { SidepaneContent } from "../../../atoms/sidepane-atom";
import { SidepaneHeader } from "../sidepane-header";

// Only the webpage variant of the union — the registry hands this previewer
// exactly that shape, so the prop is the narrowed branch, not the whole union.
type WebpageContent = Extract<SidepaneContent, { kind: "webpage" }>;

export type WebpagePreviewerProps = {
  content: WebpageContent;
};

/**
 * Self-contained `kind:"webpage"` previewer (design "A": header + body
 * co-located). Mounts the shared `SidepaneHeader`, then hands the
 * agent-authored URL to `SandboxedIframe` — the shared body that gates the URL
 * to `https:` and frames it under the minimal `sandbox="allow-scripts"`. The
 * D3 file `html` subtype reuses that same body, so the security-critical iframe
 * logic lives in one place instead of being duplicated (as it was in legacy).
 */
export function WebpagePreviewer({
  content,
}: WebpagePreviewerProps): JSX.Element {
  const { t } = useLingui();
  const title = t({
    id: "chat.webpagePreviewer.title",
    message: "Preview Page",
  });
  const blockedCopy = t({
    id: "chat.webpagePreviewer.blocked",
    message: "This page can't be shown here. Open it in a new tab to view it.",
  });
  return (
    <div className="bg-surface-basic flex h-full flex-col overflow-hidden">
      <SidepaneHeader icon={Globe} title={title} />
      <SandboxedIframe
        url={content.url}
        title={title}
        blockedCopy={blockedCopy}
      />
    </div>
  );
}
