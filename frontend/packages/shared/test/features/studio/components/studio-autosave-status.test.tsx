import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StudioAutosaveStatus } from "@/features/studio/components/studio-autosave-status";

describe("StudioAutosaveStatus", () => {
  it("offers reload instead of retry for version conflicts", async () => {
    const user = userEvent.setup();
    const onConflict = vi.fn();
    const onRetry = vi.fn();
    render(
      <StudioAutosaveStatus
        status="conflict"
        valid
        canRetry
        canDiscard={false}
        onDiscard={vi.fn()}
        onRetry={onRetry}
        onConflict={onConflict}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Reload" }));
    expect(onConflict).toHaveBeenCalledOnce();
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("hides retry for a discard-only save failure", () => {
    render(
      <StudioAutosaveStatus
        status="error"
        valid
        canRetry={false}
        canDiscard
        onDiscard={vi.fn()}
        onRetry={vi.fn()}
        onConflict={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Discard failed upload" }),
    ).toBeEnabled();
  });

  it("offers retry for a retryable save failure", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <StudioAutosaveStatus
        status="error"
        valid
        canRetry
        canDiscard={false}
        onDiscard={vi.fn()}
        onRetry={onRetry}
        onConflict={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
