import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { OrganizationMembersPage } from "@sico/shared/features/organization/index.ts";
import { createFileRoute } from "@tanstack/react-router";

const ORGANIZATION_TITLE = msg({
  id: "organization.route.title",
  message: "Manage Organization · SICO",
});

export const Route = createFileRoute("/_authed/organization/members")({
  head: () => ({ meta: [{ title: i18n._(ORGANIZATION_TITLE) }] }),
  component: OrganizationMembersPage,
});
