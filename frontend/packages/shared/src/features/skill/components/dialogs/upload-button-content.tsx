import { useLingui } from "@lingui/react/macro";
import { Loader2 } from "lucide-react";
import { type ReactElement } from "react";

// Upload button label: a spinner + "Uploading…" while `pending`, otherwise
// "Upload". A component (not a render helper) so lingui statically extracts its
// `t()` calls and a locale switch re-renders it.
export function UploadButtonContent({
  pending,
}: {
  pending: boolean;
}): ReactElement {
  const { t } = useLingui();
  if (pending) {
    return (
      <>
        <Loader2 className="animate-spin" />
        {t({ id: "common.status.uploading", message: "Uploading…" })}
      </>
    );
  }
  return <>{t({ id: "common.action.upload", message: "Upload" })}</>;
}
