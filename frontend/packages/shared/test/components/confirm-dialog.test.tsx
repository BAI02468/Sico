import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, type Mock, vi } from "vitest";

import { ConfirmDialog } from "@/components/confirm-dialog";

const TITLE = "Delete Knowledge";
const BODY = "Permanently remove access to this knowledge across your project.";

function setup(args: {
  pending?: boolean;
  disableCancel?: boolean;
  confirmLabel?: string;
  pendingLabel?: string;
}): {
  user: ReturnType<typeof userEvent.setup>;
  onConfirm: Mock;
  onOpenChange: Mock;
  rerender: (next: {
    pending?: boolean;
    disableCancel?: boolean;
    confirmLabel?: string;
    pendingLabel?: string;
  }) => void;
} {
  const user = userEvent.setup();
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  const ui = (a: typeof args): React.JSX.Element => (
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      title={TITLE}
      body={BODY}
      onConfirm={onConfirm}
      pending={a.pending ?? false}
      disableCancel={a.disableCancel ?? false}
      confirmLabel={a.confirmLabel}
      pendingLabel={a.pendingLabel}
    />
  );
  const { rerender } = render(ui(args));
  return {
    user,
    onConfirm,
    onOpenChange,
    rerender: (next) => rerender(ui(next)),
  };
}

describe("<ConfirmDialog>", () => {
  it("renders the consumer-provided title and body", () => {
    setup({});

    expect(screen.getByText(TITLE)).toBeInTheDocument();
    expect(screen.getByText(BODY)).toBeInTheDocument();
    expect(screen.getByText(TITLE).parentElement).toHaveClass("gap-2");
  });

  it("uses the shared confirmation width by default", () => {
    setup({});

    expect(screen.getByRole("dialog")).toHaveClass("w-150");
  });

  it("clicking Delete signals intent via onConfirm", async () => {
    const { user, onConfirm, onOpenChange } = setup({});

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("while pending the action reads 'Deleting…' and is disabled", () => {
    setup({ pending: true });

    const action = screen.getByRole("button", { name: /deleting…/i });
    expect(action).toBeDisabled();
  });

  it("uses custom confirm/pending labels when provided", () => {
    const { rerender } = setup({
      confirmLabel: "Dismiss",
      pendingLabel: "Dismissing…",
    });
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
    rerender({
      confirmLabel: "Dismiss",
      pendingLabel: "Dismissing…",
      pending: true,
    });
    expect(screen.getByRole("button", { name: /dismissing…/i })).toBeDisabled();
  });

  it("keeps subtle Cancel available while confirmation is pending", () => {
    setup({ pending: true });

    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect(cancel).toBeEnabled();
    expect(cancel).toHaveClass("bg-button-subtle-fill-rest");
  });

  it("clicking Cancel requests close without confirming", async () => {
    const { user, onConfirm, onOpenChange } = setup({});

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onOpenChange).toHaveBeenCalled();
    expect(onOpenChange.mock.lastCall?.[0]).toBe(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("hides and disables cancellation controls when cancellation is disabled", () => {
    setup({ disableCancel: true });

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Close" }),
    ).not.toBeInTheDocument();
  });

  it("requests close from Escape by default", async () => {
    const { user, onOpenChange } = setup({});

    screen.getByRole("button", { name: "Delete" }).focus();
    await user.keyboard("{Escape}");

    expect(onOpenChange.mock.lastCall?.[0]).toBe(false);
  });

  it("does not request close from Escape when cancellation is disabled", async () => {
    const { user, onOpenChange } = setup({ disableCancel: true });

    screen.getByRole("button", { name: "Delete" }).focus();
    await user.keyboard("{Escape}");

    expect(onOpenChange.mock.lastCall?.[0]).not.toBe(false);
    expect(screen.getByRole("dialog")).toBeVisible();
  });

  it("requests close from an outside pointer by default", async () => {
    const { user, onOpenChange } = setup({});
    await user.pointer({ target: document.body, keys: "[MouseLeft]" });

    expect(onOpenChange.mock.lastCall?.[0]).toBe(false);
  });

  it("does not request close from an outside pointer when cancellation is disabled", async () => {
    const { user, onOpenChange } = setup({ disableCancel: true });
    await user.pointer({ target: document.body, keys: "[MouseLeft]" });

    expect(onOpenChange.mock.lastCall?.[0]).not.toBe(false);
    expect(screen.getByRole("dialog")).toBeVisible();
  });
});
