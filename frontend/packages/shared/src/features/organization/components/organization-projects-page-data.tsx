import type * as React from "react";

import { OrganizationProjectsPageContent } from "./organization-projects-page-content";
import { OrganizationUnavailable } from "./organization-unavailable";
import { useBoundOrganizationSuspenseQuery } from "../../../hooks/use-bound-organization";

export function OrganizationProjectsPageData(): React.JSX.Element {
  const organization = useBoundOrganizationSuspenseQuery().data;
  if (!organization) {
    return <OrganizationUnavailable />;
  }
  return <OrganizationProjectsPageContent organization={organization} />;
}
