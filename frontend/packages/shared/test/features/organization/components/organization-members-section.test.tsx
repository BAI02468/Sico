import { i18n } from "@lingui/core";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type OrganizationMember } from "@/features/membership";
import { OrganizationMembersSection } from "@/features/organization/components/organization-members-section";

const { changeMutate, removeMutate, inviteMutate } = vi.hoisted(() => ({
  changeMutate: vi.fn(),
  removeMutate: vi.fn(),
  inviteMutate: vi.fn(),
}));

vi.mock("@/features/organization/hooks/use-change-organization-role", () => ({
  useChangeOrganizationRole: () => ({ mutate: changeMutate, isPending: false }),
}));
vi.mock("@/features/organization/hooks/use-remove-organization-member", () => ({
  useRemoveOrganizationMember: () => ({
    mutate: removeMutate,
    isPending: false,
  }),
}));
vi.mock("@/features/organization/hooks/use-invite-organization-member", () => ({
  useInviteOrganizationMember: () => ({
    mutate: inviteMutate,
    isPending: false,
  }),
}));

const ZH_SELF_REMOVE_MESSAGES = {
  "organization.members.selfRemoveDenied": "你不能将自己移出组织。",
};

const members: OrganizationMember[] = [
  {
    id: 1,
    email: "admin@example.com",
    alias: "Alex",
    role: "org_admin",
    roleCodes: ["org_member", "org_admin"],
  },
  {
    id: 2,
    email: "dev@example.com",
    alias: "Dana",
    role: "developer",
    roleCodes: ["org_member", "developer"],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  i18n.loadAndActivate({ locale: "en", messages: {} });
});

describe("OrganizationMembersSection", () => {
  it("renders only backend organization roles with unavailable joined dates", () => {
    render(
      <OrganizationMembersSection
        organizationId={9}
        orgName="SICO"
        members={members}
        canManage
        currentUserId={null}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Joined" })).toBeVisible();
    expect(screen.getByText("Admin")).toBeVisible();
    expect(screen.getByText("Developer")).toBeVisible();
    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(screen.queryByText("Owner")).not.toBeInTheDocument();
    expect(screen.queryByText("Operator")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Invite" })).toHaveClass("mr-2");
  });

  it("renders a read-only roster for users without manage permission", () => {
    render(
      <OrganizationMembersSection
        organizationId={9}
        orgName="SICO"
        members={members}
        canManage={false}
        currentUserId={2}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Invite" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Change role" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Member actions" }),
    ).toHaveLength(members.length);
  });

  it("keeps the current admin's own role read-only", () => {
    render(
      <OrganizationMembersSection
        organizationId={9}
        orgName="SICO"
        members={members}
        canManage
        currentUserId={1}
      />,
    );
    const ownRow = screen.getByText("Alex").closest("tr");
    const otherRow = screen.getByText("Dana").closest("tr");
    if (!ownRow || !otherRow) {
      throw new Error("Expected both member rows");
    }

    expect(
      within(ownRow).queryByRole("button", { name: "Change role" }),
    ).not.toBeInTheDocument();
    expect(
      within(otherRow).getByRole("button", { name: "Change role" }),
    ).toBeVisible();
  });

  it("disables deleting the current admin's own row", async () => {
    const user = userEvent.setup();
    i18n.loadAndActivate({
      locale: "zh-CN",
      messages: ZH_SELF_REMOVE_MESSAGES,
    });
    render(
      <OrganizationMembersSection
        organizationId={9}
        orgName="SICO"
        members={members}
        canManage
        currentUserId={1}
      />,
    );
    const ownRow = screen.getByText("Alex").closest("tr");
    if (!ownRow) {
      throw new Error("Expected the current admin row");
    }

    await user.click(
      within(ownRow).getByRole("button", { name: "Member actions" }),
    );
    const deleteItem = await screen.findByRole("menuitem", { name: "Delete" });

    expect(deleteItem).toHaveAttribute("aria-disabled", "true");
    await user.hover(deleteItem);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "你不能将自己移出组织。",
    );
    await user.click(deleteItem);
    expect(
      screen.queryByRole("dialog", { name: "Delete member" }),
    ).not.toBeInTheDocument();
    expect(removeMutate).not.toHaveBeenCalled();
  });

  it("fills the available height and scrolls inside the table card", () => {
    render(
      <OrganizationMembersSection
        organizationId={9}
        orgName="SICO"
        members={members}
        canManage
        currentUserId={null}
      />,
    );

    const section = screen.getByRole("heading", { name: "Members" })
      .parentElement?.parentElement;
    expect(section).toHaveClass("min-h-0", "flex-1", "flex-col");

    const scroller = screen.getByRole("table").parentElement?.parentElement;
    expect(scroller).toHaveClass("scrollbar", "h-full", "overflow-y-auto");
    expect(scroller?.parentElement).toHaveClass(
      "min-h-0",
      "flex-1",
      "overflow-hidden",
    );
  });

  it("pins the organization owner and renders a fixed Owner role", () => {
    render(
      <OrganizationMembersSection
        organizationId={9}
        orgName="SICO"
        members={members}
        canManage
        currentUserId={null}
        ownerUsername="dev@example.com"
        currentUserIsOwner={false}
      />,
    );

    const firstMemberRow = screen.getAllByRole("row").at(1);
    if (!firstMemberRow) {
      throw new Error("Expected an owner row");
    }
    expect(within(firstMemberRow).getByText("Dana")).toBeVisible();
    expect(within(firstMemberRow).getByText("Owner")).toBeVisible();
    expect(
      within(firstMemberRow).queryByRole("button", { name: "Change role" }),
    ).not.toBeInTheDocument();
    expect(
      within(firstMemberRow).queryByRole("button", { name: "Member actions" }),
    ).not.toBeInTheDocument();
  });

  it("passes every observed grant when changing a role", async () => {
    const user = userEvent.setup();
    render(
      <OrganizationMembersSection
        organizationId={9}
        orgName="SICO"
        members={members}
        canManage
        currentUserId={null}
      />,
    );
    const row = screen.getByText("Alex").closest("tr");
    if (!row) {
      throw new Error("Expected the Admin member row");
    }

    await user.click(within(row).getByRole("button", { name: "Change role" }));
    await user.click(
      await screen.findByRole("menuitemradio", { name: "Developer" }),
    );

    expect(changeMutate).toHaveBeenCalledWith(
      {
        userId: 1,
        roleCodes: ["org_member", "org_admin"],
        toRole: "developer",
      },
      expect.any(Object),
    );
  });

  it("uses a destructive personalized Delete confirmation", async () => {
    const user = userEvent.setup();
    render(
      <OrganizationMembersSection
        organizationId={9}
        orgName="SICO"
        members={members}
        canManage
        currentUserId={null}
      />,
    );
    const row = screen.getByText("Dana").closest("tr");
    if (!row) {
      throw new Error("Expected the Developer member row");
    }

    await user.click(
      within(row).getByRole("button", { name: "Member actions" }),
    );
    const deleteItem = await screen.findByRole("menuitem", { name: "Delete" });
    expect(deleteItem).toHaveAttribute("data-variant", "destructive");
    await user.click(deleteItem);

    const dialog = await screen.findByRole("dialog", { name: "Delete member" });
    expect(dialog).toHaveClass("w-150");
    expect(dialog).toHaveTextContent(
      `Delete "Dana" from this organization. This can't be undone.`,
    );
  });

  it("uses the email when the member alias is blank", async () => {
    const user = userEvent.setup();
    const blankAliasMember: OrganizationMember = {
      id: 2,
      email: "dev@example.com",
      alias: "",
      role: "developer",
      roleCodes: ["org_member", "developer"],
    };
    render(
      <OrganizationMembersSection
        organizationId={9}
        orgName="SICO"
        members={[blankAliasMember]}
        canManage
        currentUserId={null}
      />,
    );
    const row = screen.getByText("dev@example.com").closest("tr");
    if (!row) {
      throw new Error("Expected the Developer member row");
    }

    await user.click(
      within(row).getByRole("button", { name: "Member actions" }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));

    expect(await screen.findByRole("dialog")).toHaveTextContent(
      `Delete "dev@example.com" from this organization.`,
    );
  });

  it("passes every observed grant when deleting another member", async () => {
    const user = userEvent.setup();
    render(
      <OrganizationMembersSection
        organizationId={9}
        orgName="SICO"
        members={members}
        canManage
        currentUserId={1}
      />,
    );
    const row = screen.getByText("Dana").closest("tr");
    if (!row) {
      throw new Error("Expected the Developer member row");
    }

    await user.click(
      within(row).getByRole("button", { name: "Member actions" }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(removeMutate).toHaveBeenCalledWith(
      { userId: 2, roleCodes: ["org_member", "developer"] },
      expect.any(Object),
    );
  });

  it("uses the shared spacing token around the members content", () => {
    render(
      <OrganizationMembersSection
        organizationId={9}
        orgName="SICO"
        members={members}
        canManage
        currentUserId={null}
      />,
    );

    const membersHeading = screen.getByRole("heading", { name: "Members" });
    expect(membersHeading.parentElement?.parentElement).toHaveClass("gap-3.5");
    expect(membersHeading).toHaveClass("flex", "h-8", "items-center");
  });

  it("opens the Invite dialog", async () => {
    const user = userEvent.setup();
    render(
      <OrganizationMembersSection
        organizationId={9}
        orgName="SICO"
        members={members}
        canManage
        currentUserId={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Invite" }));

    expect(
      screen.getByRole("dialog", { name: "Invite to SICO" }),
    ).toBeVisible();
  });
});
