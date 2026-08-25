import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { toast } from "@sico/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mutate = vi.fn();
let isPending = false;

vi.mock("@/features/studio/hooks/use-single-agent-mutations", () => ({
  useDeleteSingleAgentMutation: () => ({ isPending, mutate }),
}));

const { StudioDeleteAgentDialog } =
  await import("@/features/studio/components/studio-delete-agent-dialog");

const agentId = "a3c0bc10-6d1c-4b33-a866-f3e1b2b91cde";

function renderDialog(
  onDeleted = vi.fn(),
  onOpenChange = vi.fn(),
): ReturnType<typeof render> {
  return render(
    <I18nProvider i18n={i18n}>
      <StudioDeleteAgentDialog
        agentId={agentId}
        agentName="Atlas"
        open
        onOpenChange={onOpenChange}
        onDeleted={onDeleted}
      />
    </I18nProvider>,
  );
}

describe("StudioDeleteAgentDialog", () => {
  beforeEach(() => {
    isPending = false;
    mutate.mockReset();
  });

  it("shows an inverted success toast and invokes the deletion callback", async () => {
    const user = userEvent.setup();
    const success = vi.spyOn(toast, "success");
    const onDeleted = vi.fn();
    mutate.mockImplementation((_agentId, options) => options?.onSuccess?.());
    renderDialog(onDeleted);

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(mutate).toHaveBeenCalledWith(agentId, expect.any(Object));
    expect(success).toHaveBeenCalledWith("Digital worker deleted.", {
      invert: true,
    });
    expect(onDeleted).toHaveBeenCalledOnce();
  });

  it("keeps the dialog open and reports delete failure", async () => {
    const user = userEvent.setup();
    const error = vi.spyOn(toast, "error");
    mutate.mockImplementation((_agentId, options) => options?.onError?.());
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(error).toHaveBeenCalledWith("Couldn't delete this digital worker.");
    expect(
      screen.getByRole("dialog", { name: "Delete digital worker" }),
    ).toBeVisible();
  });

  it("rejects Cancel and Escape dismissal while deletion is pending", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    isPending = true;
    renderDialog(vi.fn(), onOpenChange);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.keyboard("{Escape}");

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(
      screen.getByRole("dialog", { name: "Delete digital worker" }),
    ).toBeVisible();
  });
});
