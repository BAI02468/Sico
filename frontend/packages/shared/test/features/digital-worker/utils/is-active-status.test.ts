import { describe, expect, it } from "vitest";

import { AgentStatusSchema } from "@/features/digital-worker/schemas/agent";
import { isActiveStatus } from "@/features/digital-worker/utils/is-active-status";

const active = [AgentStatusSchema.enum.ACTIVE, AgentStatusSchema.enum.NEW];
const readOnly = [
  undefined,
  null,
  AgentStatusSchema.enum.UNKNOWN,
  AgentStatusSchema.enum.ONBOARDING,
  AgentStatusSchema.enum.INACTIVE,
  AgentStatusSchema.enum.ABORTED,
  AgentStatusSchema.enum.ONBOARDING_SAVED,
];

describe("isActiveStatus", () => {
  it.each(active)("treats status %s as operational", (status) => {
    expect(isActiveStatus(status)).toBe(true);
  });

  it.each(readOnly)("treats status %s as read-only", (status) => {
    expect(isActiveStatus(status)).toBe(false);
  });
});
