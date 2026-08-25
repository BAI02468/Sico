import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PublishAccessDialog } from "@/features/studio/components/publish-access-dialog";

const ZH_PUBLISH_MESSAGES = {
  "studio.publishDialog.onlyMe": "仅我",
  "studio.publishDialog.organization": "我的组织",
};

afterEach(() => {
  i18n.loadAndActivate({ locale: "en", messages: {} });
});

function renderDialog({
  pending = false,
  onOpenChange = vi.fn(),
  onPublish = vi.fn(),
}: {
  pending?: boolean;
  onOpenChange?: (open: boolean) => void;
  onPublish?: (access: "only_me" | "organization") => void;
} = {}): ReturnType<typeof render> {
  return render(
    <I18nProvider i18n={i18n}>
      <PublishAccessDialog
        open
        pending={pending}
        onOpenChange={onOpenChange}
        onPublish={onPublish}
      />
    </I18nProvider>,
  );
}

describe("PublishAccessDialog", () => {
  it("defaults to Only me and shows both access descriptions", async () => {
    const user = userEvent.setup();
    renderDialog();

    expect(screen.getByLabelText("Access")).toHaveTextContent("Only me");
    await user.click(screen.getByLabelText("Access"));

    expect(
      await screen.findByText(
        "Only you and invited editors can view and edit this digital worker.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Anyone in your organization can add and use this digital worker.",
      ),
    ).toBeVisible();
  });

  it("updates the selected access item for the active locale", () => {
    renderDialog();

    act(() => {
      i18n.loadAndActivate({ locale: "zh-CN", messages: ZH_PUBLISH_MESSAGES });
    });

    expect(screen.getByLabelText("Access")).toHaveTextContent("仅我");
  });

  it("publishes the selected organization access", async () => {
    const user = userEvent.setup();
    const onPublish = vi.fn();
    renderDialog({ onPublish });

    await user.click(screen.getByLabelText("Access"));
    await user.click(await screen.findByText("My organization"));
    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(onPublish).toHaveBeenCalledWith("organization");
  });

  it("locks dismissal, selection, and confirmation while publishing", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderDialog({ pending: true, onOpenChange });

    expect(screen.getByLabelText("Access")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Publishing…" })).toBeDisabled();

    await user.keyboard("{Escape}");

    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
