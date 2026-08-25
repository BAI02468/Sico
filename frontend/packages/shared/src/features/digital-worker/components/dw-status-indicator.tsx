import { type MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { cn } from "@sico/ui/lib/utils.ts";
import type { ReactElement } from "react";

import {
  type ConversationRunStatus,
  ConversationRunStatusSchema,
} from "../../../schemas/conversation-run-status";
import { type AgentStatus, AgentStatusSchema } from "../schemas/agent";

// The three visual tones a status maps to. Each is the sico text-colour
// token shared by the dot (`bg-current`) and the label — no fill, mirroring
// dwp's `StatusTag appearance="subtle"`.
const TONE_CLASS = {
  success: "text-status-success-foreground",
  info: "text-status-info-foreground",
  muted: "text-foreground-tertiary",
} as const;

export type StatusTone = keyof typeof TONE_CLASS;

export type DwStatusIndicatorProps = {
  tone: StatusTone;
  label: string;
};

// Keep lifecycle metadata separate from the execution override so protected
// lifecycle states retain their existing presentation. Labels stay as message
// descriptors until the caller resolves them reactively with `useLingui().t`.
export type StatusIndicatorMeta = {
  tone: StatusTone;
  label: MessageDescriptor;
};

const WORKING_STATUS_INDICATOR: StatusIndicatorMeta = {
  tone: "info",
  label: msg({ id: "digitalWorker.status.working", message: "Working" }),
};

export const STATUS_INDICATOR: Record<AgentStatus, StatusIndicatorMeta> = {
  [AgentStatusSchema.enum.ACTIVE]: {
    tone: "success",
    label: msg({ id: "digitalWorker.status.active", message: "Active" }),
  },
  [AgentStatusSchema.enum.NEW]: {
    tone: "success",
    label: msg({ id: "digitalWorker.status.active", message: "Active" }),
  },
  [AgentStatusSchema.enum.ONBOARDING]: {
    tone: "info",
    label: msg({
      id: "digitalWorker.status.onboarding",
      message: "Onboarding",
    }),
  },
  [AgentStatusSchema.enum.ONBOARDING_SAVED]: {
    tone: "info",
    label: msg({
      id: "digitalWorker.status.onboarding",
      message: "Onboarding",
    }),
  },
  [AgentStatusSchema.enum.INACTIVE]: {
    tone: "muted",
    label: msg({ id: "digitalWorker.status.inactive", message: "Inactive" }),
  },
  [AgentStatusSchema.enum.ABORTED]: {
    tone: "muted",
    label: msg({ id: "digitalWorker.status.aborted", message: "Aborted" }),
  },
  [AgentStatusSchema.enum.UNKNOWN]: {
    tone: "info",
    label: msg({ id: "digitalWorker.status.unknown", message: "Unknown" }),
  },
};

export function resolveStatusIndicator(
  status: AgentStatus | null | undefined,
  conversationStatus: ConversationRunStatus | undefined,
): StatusIndicatorMeta | undefined {
  if (status === null || status === undefined) {
    return undefined;
  }

  const canShowWorking =
    status === AgentStatusSchema.enum.ACTIVE ||
    status === AgentStatusSchema.enum.NEW;
  if (
    canShowWorking &&
    conversationStatus === ConversationRunStatusSchema.enum.RUNNING
  ) {
    return WORKING_STATUS_INDICATOR;
  }

  return STATUS_INDICATOR[status];
}

/**
 * Presents metadata selected by `resolveStatusIndicator` as a same-colour dot
 * and label. Keeping selection outside this component lets lifecycle and
 * execution states share one presentation without branching here.
 */
export function DwStatusIndicator({
  tone,
  label,
}: DwStatusIndicatorProps): ReactElement {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1 text-xs leading-4 font-medium whitespace-nowrap",
        TONE_CLASS[tone],
      )}
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
      {label}
    </span>
  );
}
