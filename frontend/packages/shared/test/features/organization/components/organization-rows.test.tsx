import { i18n } from "@lingui/core";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { type OrganizationMember } from "@/features/membership";
import { OrgMemberRow } from "@/features/organization/components/org-member-row";
import { OrgProjectRow } from "@/features/organization/components/org-project-row";
import { type OrganizationProject } from "@/features/projects/schemas/project";

vi.mock("@/features/organization/hooks/use-change-organization-role", () => ({
  useChangeOrganizationRole: () => ({ mutate: vi.fn(), isPending: false }),
}));

const LOCAL_NOON_MS = new Date("2026-01-18T12:00:00").getTime();
const LOCAL_NOON_SECONDS = Math.floor(LOCAL_NOON_MS / 1000);

const project: OrganizationProject = {
  id: 7,
  name: "Atlas",
  description: "",
  iconUrl: "",
  memberType: 0,
  agentInstances: [],
  ownerUsername: "owner@example.com",
  creatorUsername: "owner@example.com",
  organizationId: 9,
  createdAt: LOCAL_NOON_SECONDS,
  updatedAt: LOCAL_NOON_MS,
};

function member(createdAt?: number): OrganizationMember {
  return {
    id: 3,
    email: "member@example.com",
    alias: "Member",
    role: "org_member",
    roleCodes: ["org_member"],
    createdAt,
  };
}

function renderProjectRow(): void {
  render(
    <table>
      <tbody>
        <OrgProjectRow
          project={project}
          counts={{ mobile: 0, windows: 0 }}
          canManageDevices={false}
          onManageDevices={vi.fn()}
        />
      </tbody>
    </table>,
  );
}

function renderMemberRow(createdAt?: number): void {
  render(
    <table>
      <tbody>
        <OrgMemberRow
          organizationId={9}
          member={member(createdAt)}
          canEdit={false}
          isOwner
        />
      </tbody>
    </table>,
  );
}

afterEach(() => {
  i18n.loadAndActivate({ locale: "en", messages: {} });
});

describe("<OrgProjectRow>", () => {
  it("normalizes epoch seconds and formats the created date in English", () => {
    i18n.loadAndActivate({ locale: "en", messages: {} });
    renderProjectRow();

    expect(screen.getByText(i18n.date(LOCAL_NOON_MS))).toBeVisible();
  });
});

describe("<OrgMemberRow>", () => {
  it("normalizes epoch seconds in the active zh-CN locale", () => {
    i18n.loadAndActivate({ locale: "zh-CN", messages: {} });
    renderMemberRow(LOCAL_NOON_SECONDS);

    expect(screen.getByText(i18n.date(LOCAL_NOON_MS))).toBeVisible();
  });

  it("renders an em dash when the creation date is missing", () => {
    renderMemberRow();

    expect(screen.getByText("—")).toBeVisible();
  });

  it("renders an em dash when the creation date is zero", () => {
    renderMemberRow(0);

    expect(screen.getByText("—")).toBeVisible();
  });
});
