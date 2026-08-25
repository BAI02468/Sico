import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { UninstallConfirmDialog } from "@/features/chat/components/sidepane/previewers/sandbox/uninstall-confirm-dialog";

describe("UninstallConfirmDialog", () => {
  it("confirms uninstalling from the current device", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <UninstallConfirmDialog
        open
        forAllDevices={false}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "This app will be removed from this device.",
    );
    await user.click(screen.getByRole("button", { name: "Uninstall" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("keeps Cancel available while an all-device uninstall is pending", () => {
    render(
      <UninstallConfirmDialog
        open
        forAllDevices
        pending
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "This app will be removed from all devices.",
    );
    expect(
      screen.getByRole("button", { name: /uninstalling/i }),
    ).toBeDisabled();
    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect(cancel).toBeEnabled();
    expect(cancel).toHaveClass("bg-button-subtle-fill-rest");
  });
});
