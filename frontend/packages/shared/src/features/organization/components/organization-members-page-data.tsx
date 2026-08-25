import type * as React from "react";

import { OrganizationMembersPageContent } from "./organization-members-page-content";
import { OrganizationUnavailable } from "./organization-unavailable";
import { useBoundOrganizationSuspenseQuery } from "../../../hooks/use-bound-organization";

export function OrganizationMembersPageData(): React.JSX.Element {
  const organization = useBoundOrganizationSuspenseQuery().data;
  if (!organization) {
    return <OrganizationUnavailable />;
  }
  return <OrganizationMembersPageContent organization={organization} />;
}
