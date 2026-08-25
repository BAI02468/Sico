import { OrganizationManagementShell } from "@sico/shared/features/organization/index.ts";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import type * as React from "react";

// The organization segment replaces the primary application sidebar with its
// dedicated management header and Organization / Projects navigation.
export const Route = createFileRoute("/_authed/organization")({
  staticData: { hidePrimarySidebar: true },
  component: OrganizationOutlet,
});

function OrganizationOutlet(): React.JSX.Element {
  return (
    <OrganizationManagementShell>
      <Outlet />
    </OrganizationManagementShell>
  );
}
