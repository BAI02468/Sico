import { useCallback, useMemo } from "react";
import type * as React from "react";

import { OrganizationProjectsView } from "./organization-projects-view";
import { useOrganizationDevicesQuery } from "../../devices";
import { useOrganizationPermission } from "../../rbac/hooks/use-organization-permission";
import {
  selectDedupedOrganizationProjects,
  useOrganizationProjectsQuery,
} from "../hooks/use-organization-projects-query";
import { type OrganizationSummary } from "../schemas/organization";

export function OrganizationProjectsPageContent({
  organization,
}: {
  organization: OrganizationSummary;
}): React.JSX.Element {
  const organizationId = organization.id;
  const { canManageOrganizationDevices } = useOrganizationPermission();
  const projectsQuery = useOrganizationProjectsQuery(organizationId);
  const projects = useMemo(
    () => selectDedupedOrganizationProjects(projectsQuery.data.pages),
    [projectsQuery.data.pages],
  );
  const devices = useOrganizationDevicesQuery(organizationId).data;
  const { fetchNextPage: queryFetchNextPage } = projectsQuery;
  const fetchNextPage = useCallback(() => {
    void queryFetchNextPage();
  }, [queryFetchNextPage]);
  return (
    <OrganizationProjectsView
      organizationId={organizationId}
      projects={projects}
      projectCount={projectsQuery.data.pages[0]?.total ?? 0}
      devices={devices}
      hasNextPage={projectsQuery.hasNextPage}
      isFetchingNextPage={projectsQuery.isFetchingNextPage}
      isFetchNextPageError={projectsQuery.isFetchNextPageError}
      fetchNextPage={fetchNextPage}
      canManage={canManageOrganizationDevices}
    />
  );
}
