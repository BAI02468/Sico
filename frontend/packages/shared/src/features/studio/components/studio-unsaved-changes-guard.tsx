import { useLingui } from "@lingui/react/macro";
import { useBlocker } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { ConfirmDialog } from "../../../components/confirm-dialog";

export function StudioUnsavedChangesGuard({
  enabled,
  onFlush,
}: {
  enabled: boolean;
  onFlush?: () => Promise<boolean>;
}): React.JSX.Element {
  const { t } = useLingui();
  const enabledRef = useRef(enabled);
  const onFlushRef = useRef(onFlush);
  const attemptRef = useRef(0);
  const [showConfirm, setShowConfirm] = useState(false);
  enabledRef.current = enabled;
  onFlushRef.current = onFlush;
  const shouldBlockFn = useCallback(
    ({
      current,
      next,
    }: {
      current: { pathname: string };
      next: { pathname: string };
    }) => enabledRef.current && current.pathname !== next.pathname,
    [],
  );
  const blocker = useBlocker({
    shouldBlockFn,
    enableBeforeUnload: () => enabledRef.current,
    withResolver: true,
  });
  const { proceed, status: blockerStatus } = blocker;

  useEffect(() => {
    if (blockerStatus !== "blocked") {
      attemptRef.current += 1;
      queueMicrotask(() => setShowConfirm(false));
      return;
    }
    attemptRef.current += 1;
    const attempt = attemptRef.current;
    const flush = onFlushRef.current;
    if (!flush) {
      queueMicrotask(() => setShowConfirm(true));
      return;
    }
    void flush().then((saved) => {
      if (attempt !== attemptRef.current) {
        return;
      }
      if (saved) {
        proceed();
      } else {
        setShowConfirm(true);
      }
    });
  }, [blockerStatus, proceed]);

  const cancel = (): void => {
    attemptRef.current += 1;
    setShowConfirm(false);
    if (blockerStatus === "blocked") {
      blocker.reset();
    }
  };
  const discard = (): void => {
    attemptRef.current += 1;
    if (blockerStatus === "blocked") {
      proceed();
    }
  };

  return (
    <ConfirmDialog
      open={blockerStatus === "blocked" && showConfirm}
      onOpenChange={(open) => {
        if (!open) {
          cancel();
        }
      }}
      title={t({
        id: "studio.setupEditor.discard.title",
        message: "Discard changes",
      })}
      body={t({
        id: "studio.setupEditor.discard.body",
        message: "Your unsaved changes will be lost.",
      })}
      confirmLabel={t({
        id: "studio.setupEditor.discard.confirm",
        message: "Discard",
      })}
      onConfirm={discard}
    />
  );
}
