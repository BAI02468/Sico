import { i18n } from "@lingui/core";
import { toast } from "@sico/ui";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizationUserNotFoundError } from "@/features/membership";
import { EditOrgNameDialog } from "@/features/organization/components/edit-org-name-dialog";
import { InviteMemberDialog } from "@/features/organization/components/invite-org-member-dialog";

const { inviteMutate, renameMutate } = vi.hoisted(() => ({
  inviteMutate: vi.fn(),
  renameMutate: vi.fn(),
}));
const ZH_RENAME_MESSAGES = {
  "organization.editName.success": "组织名称已更新。",
};

vi.mock("@sico/ui", async (importActual) => {
  const actual = await importActual<typeof import("@sico/ui")>();
  return { ...actual, toast: { success: vi.fn(), error: vi.fn() } };
});

vi.mock("@/features/organization/hooks/use-invite-organization-member", () => ({
  useInviteOrganizationMember: () => ({
    mutate: inviteMutate,
    isPending: false,
  }),
}));

vi.mock("@/features/organization/hooks/use-rename-organization", () => ({
  useRenameOrganization: () => ({
    mutate: renameMutate,
    isPending: false,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  i18n.loadAndActivate({ locale: "en", messages: {} });
});

describe("Organization dialogs", () => {
  it("uses uppercase field-label styling in the Invite dialog", () => {
    render(
      <InviteMemberDialog
        organizationId={9}
        orgName="SICO"
        open
        onOpenChange={vi.fn()}
      />,
    );

    for (const label of ["Email", "Role"]) {
      expect(screen.getByText(label)).toHaveClass(
        "text-xs",
        "font-semibold",
        "tracking-wider",
        "uppercase",
      );
    }
    expect(screen.getByRole("combobox")).toHaveTextContent("Operator");
    expect(screen.getByRole("combobox")).not.toHaveTextContent("org_member");
  });

  it("opens the role options only from the select field", async () => {
    const user = userEvent.setup();
    render(
      <InviteMemberDialog
        organizationId={9}
        orgName="SICO"
        open
        onOpenChange={vi.fn()}
      />,
    );

    await user.click(screen.getByText("Role"));
    expect(
      screen.queryByRole("option", { name: /Admin/ }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Role" }));
    expect(await screen.findByRole("option", { name: /Admin/ })).toBeVisible();
  });

  it("uses composite-option spacing in the role dropdown", async () => {
    const user = userEvent.setup();
    render(
      <InviteMemberDialog
        organizationId={9}
        orgName="SICO"
        open
        onOpenChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Role" }));
    const options = await screen.findAllByRole("option");

    for (const option of options) {
      expect(option).toHaveClass("h-auto", "items-start", "py-2", "pl-3.5");
    }
  });

  it("describes the Operator role as collaborating with digital workers", async () => {
    const user = userEvent.setup();
    render(
      <InviteMemberDialog
        organizationId={9}
        orgName="SICO"
        open
        onOpenChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Role" }));

    expect(
      await screen.findByText("Can collaborate with digital workers"),
    ).toBeVisible();
  });

  it("uses the Organization dialog width in Invite", () => {
    render(
      <InviteMemberDialog
        organizationId={9}
        orgName="SICO"
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog")).toHaveClass("w-130");
  });

  it("toasts an Invite backend error and leaves the dialog open", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <InviteMemberDialog
        organizationId={9}
        orgName="SICO"
        open
        onOpenChange={onOpenChange}
      />,
    );

    await user.type(screen.getByRole("textbox", { name: "Email" }), "x@y.com");
    await user.click(screen.getByRole("button", { name: "Invite" }));
    const callbacks = inviteMutate.mock.calls[0]?.[1];
    await act(async () => {
      await callbacks.onError(new OrganizationUserNotFoundError());
    });

    expect(toast.error).toHaveBeenCalledWith(
      "This user hasn't registered yet.",
    );
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(
      screen.queryByText("This user hasn't registered yet."),
    ).not.toBeInTheDocument();
  });

  it("uses Figma width and uppercase label styling in Edit Organization", () => {
    render(
      <EditOrgNameDialog
        organizationId={9}
        currentName="SICO"
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog")).toHaveClass("w-130");
    expect(screen.getByText("Organization name")).toHaveClass(
      "text-xs",
      "font-semibold",
      "tracking-wider",
      "uppercase",
    );
  });

  it("does not offer unsupported organization avatar editing", () => {
    render(
      <EditOrgNameDialog
        organizationId={9}
        currentName="SICO"
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Choose organization avatar" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Organization avatar file"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Change avatar")).not.toBeInTheDocument();
  });

  it("toasts Rename success and closes the dialog", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <EditOrgNameDialog
        organizationId={9}
        currentName="SICO"
        open
        onOpenChange={onOpenChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));
    const callbacks = renameMutate.mock.calls[0]?.[1];
    await act(async () => {
      await callbacks.onSuccess();
    });

    expect(toast.success).toHaveBeenCalledWith("Organization name updated.", {
      invert: true,
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("translates Rename success when the mutation callback runs", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <EditOrgNameDialog
        organizationId={9}
        currentName="SICO"
        open
        onOpenChange={onOpenChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));
    const callbacks = renameMutate.mock.calls[0]?.[1];
    act(() => {
      i18n.loadAndActivate({
        locale: "zh-CN",
        messages: ZH_RENAME_MESSAGES,
      });
    });
    await act(async () => {
      await callbacks.onSuccess();
    });

    expect(toast.success).toHaveBeenCalledWith("组织名称已更新。", {
      invert: true,
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("toasts a Rename backend error and leaves the dialog open", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <EditOrgNameDialog
        organizationId={9}
        currentName="SICO"
        open
        onOpenChange={onOpenChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));
    const callbacks = renameMutate.mock.calls[0]?.[1];
    await act(async () => {
      await callbacks.onError(new Error("backend"));
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Couldn't rename this organization.",
    );
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(
      screen.queryByText("Couldn't rename this organization."),
    ).not.toBeInTheDocument();
  });
});
