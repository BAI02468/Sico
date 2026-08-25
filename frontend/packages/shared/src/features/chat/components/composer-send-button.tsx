import { useLingui } from "@lingui/react/macro";
import { Button } from "@sico/ui";
import { ArrowRight, Square } from "lucide-react";
import { type JSX } from "react";

import { SpinnerButton } from "./spinner-button";
import { noop } from "../../../utils/noop";

type Props = {
  isStreaming: boolean;
  isRequestPending: boolean;
  // A caller-owned async pre-step (the DW home's create-conversation) is in
  // flight. Shows the same spinner as `isRequestPending` but is NOT stoppable
  // (create can't be cancelled) — the click is a no-op and the label differs.
  submitting: boolean;
  showSend: boolean;
  disabled: boolean;
  onSend: () => void;
  onStop: () => void;
};

// Send-area glyph: ■ stop while streaming → ↻ loading after click → → send when
// text is present, else absent. `submitting` (create in flight) shows the same
// ↻ spinner but non-stoppable.
export function ComposerSendButton({
  isStreaming,
  isRequestPending,
  submitting,
  showSend,
  disabled,
  onSend,
  onStop,
}: Props): JSX.Element | null {
  const { t } = useLingui();
  if (submitting) {
    // Create in flight — non-stoppable, so the click is a no-op.
    return (
      <SpinnerButton
        label={t({ id: "chat.composer.sending", message: "Sending…" })}
        onClick={noop}
      />
    );
  }
  if (isStreaming) {
    return (
      <Button
        type="button"
        size="icon"
        variant="subtle"
        className="rounded-full bg-neutral-200"
        aria-label={t({
          id: "chat.composer.stopResponse",
          message: "Stop response",
        })}
        onClick={onStop}
      >
        {/* A dark FILLED square on a light circle — fill-current paints it solid. */}
        <Square className="text-foreground-primary fill-current" />
      </Button>
    );
  }
  if (isRequestPending) {
    // The ↻ window — the same spinner, but clicking it stops the request.
    return (
      <SpinnerButton
        label={t({ id: "chat.composer.stopRequest", message: "Stop request" })}
        onClick={onStop}
      />
    );
  }
  if (showSend) {
    return (
      <Button
        type="button"
        size="icon"
        className="rounded-full"
        aria-label={t({
          id: "chat.composer.sendMessage",
          message: "Send message",
        })}
        disabled={disabled}
        onClick={onSend}
      >
        <ArrowRight />
      </Button>
    );
  }
  return null;
}
