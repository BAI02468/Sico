import { useLingui } from "@lingui/react/macro";
import { Box, Monitor, Smartphone } from "lucide-react";
import type * as React from "react";

import { OrganizationStatCard } from "./organization-stat-card";
import { OrganizationStatCount } from "./organization-stat-count";
import { type DeviceSummary } from "../../devices";

export function OrganizationProjectStats({
  projectCount,
  summary,
}: {
  projectCount: number;
  summary: DeviceSummary;
}): React.JSX.Element {
  const { t } = useLingui();
  const projects = t({
    id: "organization.projects.stat.projects",
    message: "Projects",
  });
  const mobiles = t({
    id: "organization.projects.stat.mobiles",
    message: "Mobiles",
  });
  const windows = t({
    id: "organization.projects.stat.windows",
    message: "Windows",
  });
  return (
    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
      <OrganizationStatCard title={projects} icon={<Box aria-hidden="true" />}>
        <OrganizationStatCount count={projectCount} kind="total" />
      </OrganizationStatCard>
      <OrganizationStatCard
        title={mobiles}
        icon={<Smartphone aria-hidden="true" />}
      >
        <OrganizationStatCount
          count={summary.mobile.available}
          kind="available"
        />
        <OrganizationStatCount count={summary.mobile.total} kind="total" />
      </OrganizationStatCard>
      <OrganizationStatCard
        title={windows}
        icon={<Monitor aria-hidden="true" />}
      >
        <OrganizationStatCount
          count={summary.windows.available}
          kind="available"
        />
        <OrganizationStatCount count={summary.windows.total} kind="total" />
      </OrganizationStatCard>
    </div>
  );
}
