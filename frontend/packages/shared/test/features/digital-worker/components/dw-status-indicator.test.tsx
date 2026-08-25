import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  DwStatusIndicator,
  resolveStatusIndicator,
  STATUS_INDICATOR,
  type StatusTone,
} from "@/features/digital-worker/components/dw-status-indicator";
import {
  type AgentStatus,
  AgentStatusSchema,
} from "@/features/digital-worker/schemas/agent";
import {
  type ConversationRunStatus,
  ConversationRunStatusSchema,
} from "@/schemas/conversation-run-status";

describe("<DwStatusIndicator>", () => {
  // The indicator is a same-colour dot + label on a transparent background
  // (mirrors dwp's `StatusTag appearance="subtle"`, NOT a filled badge).
  // Assert the sico text-colour token per tone so a regression back to a
  // filled `<Badge>` — or a wrong token — is caught.
  it.each<[StatusTone, string]>([
    ["success", "text-status-success-foreground"],
    ["info", "text-status-info-foreground"],
    ["muted", "text-foreground-tertiary"],
  ])("tone %s renders the %s token, no fill", (tone, colourToken) => {
    render(<DwStatusIndicator tone={tone} label="Label" />);
    const indicator = screen.getByText("Label");
    // Colour token shared by dot + label.
    expect(indicator).toHaveClass(colourToken);
    // No background-fill utility — the dot+text pattern is transparent.
    expect(indicator.className).not.toMatch(/\bbg-status-/);
  });

  it("renders a decorative dot alongside the label", () => {
    render(<DwStatusIndicator tone="success" label="Active" />);
    const label = screen.getByText("Active");
    // The dot is aria-hidden (decorative) and inherits the label colour via
    // `bg-current`, so the indicator reads as one unit to assistive tech.
    const dot = label.querySelector("span[aria-hidden]");
    expect(dot).not.toBeNull();
    expect(dot).toHaveClass("bg-current");
  });
});

describe("STATUS_INDICATOR mapping", () => {
  // Each AgentStatus maps to the right {tone, label}. `label` is a Lingui
  // MessageDescriptor (resolved with `useLingui().t` at the call site), so
  // assert its source `message`. Onboarding-saved collapses to Onboarding;
  // NEW reads as Active.
  it.each<[AgentStatus, StatusTone, string]>([
    [AgentStatusSchema.enum.ACTIVE, "success", "Active"],
    [AgentStatusSchema.enum.NEW, "success", "Active"],
    [AgentStatusSchema.enum.ONBOARDING, "info", "Onboarding"],
    [AgentStatusSchema.enum.ONBOARDING_SAVED, "info", "Onboarding"],
    [AgentStatusSchema.enum.INACTIVE, "muted", "Inactive"],
    [AgentStatusSchema.enum.ABORTED, "muted", "Aborted"],
    [AgentStatusSchema.enum.UNKNOWN, "info", "Unknown"],
  ])("status %i → tone %s, label %s", (status, tone, label) => {
    const meta = STATUS_INDICATOR[status];
    expect(meta.tone).toBe(tone);
    expect(meta.label.message).toBe(label);
  });
});

describe("resolveStatusIndicator", () => {
  it.each<[AgentStatus]>([
    [AgentStatusSchema.enum.ACTIVE],
    [AgentStatusSchema.enum.NEW],
  ])("resolves running lifecycle status %i to Working", (status) => {
    const meta = resolveStatusIndicator(
      status,
      ConversationRunStatusSchema.enum.RUNNING,
    );
    expect(meta?.tone).toBe("info");
    expect(meta?.label).toMatchObject({
      id: "digitalWorker.status.working",
      message: "Working",
    });
  });

  it.each<[AgentStatus, ConversationRunStatus | undefined]>([
    [AgentStatusSchema.enum.ACTIVE, ConversationRunStatusSchema.enum.IDLE],
    [AgentStatusSchema.enum.ACTIVE, ConversationRunStatusSchema.enum.UNKNOWN],
    [AgentStatusSchema.enum.ACTIVE, undefined],
    [AgentStatusSchema.enum.NEW, ConversationRunStatusSchema.enum.IDLE],
    [AgentStatusSchema.enum.NEW, ConversationRunStatusSchema.enum.UNKNOWN],
    [AgentStatusSchema.enum.NEW, undefined],
  ])(
    "keeps lifecycle status %i for non-running conversation status %s",
    (status, conversationStatus) => {
      expect(resolveStatusIndicator(status, conversationStatus)).toBe(
        STATUS_INDICATOR[status],
      );
    },
  );

  it.each<[AgentStatus]>([
    [AgentStatusSchema.enum.ONBOARDING],
    [AgentStatusSchema.enum.ONBOARDING_SAVED],
    [AgentStatusSchema.enum.INACTIVE],
    [AgentStatusSchema.enum.ABORTED],
    [AgentStatusSchema.enum.UNKNOWN],
  ])("protects lifecycle status %i while running", (status) => {
    expect(
      resolveStatusIndicator(status, ConversationRunStatusSchema.enum.RUNNING),
    ).toBe(STATUS_INDICATOR[status]);
  });

  it.each<[null | undefined]>([[null], [undefined]])(
    "returns no indicator for missing lifecycle status %s",
    (status) => {
      expect(
        resolveStatusIndicator(
          status,
          ConversationRunStatusSchema.enum.RUNNING,
        ),
      ).toBeUndefined();
    },
  );
});
