import { useLingui } from "@lingui/react/macro";
import { Button } from "@sico/ui";
import { useRef, useState } from "react";
import type * as React from "react";

import { ManageDevicesDialog } from "./manage-devices-dialog";
import { OrganizationProjectStats } from "./organization-project-stats";
import { OrganizationProjectsTable } from "./organization-projects-table";
import { useInfiniteScrollSentinel } from "../../../hooks/use-infinite-scroll-sentinel";
import { buildDeviceSummary, type Device } from "../../devices";
import { type OrganizationProject } from "../../projects/schemas/project";

type OrganizationProjectsViewProps = {
  organizationId: number;
  projects: OrganizationProject[];
  projectCount: number;
  devices: Device[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  fetchNextPage: () => void;
  canManage: boolean;
};

function deviceSnapshotKey(projectId: number, devices: Device[]): string {
  const state = devices
    .map((device) =>
      JSON.stringify([
        device.sandboxId,
        device.type,
        device.projectId,
        device.allocatable,
        device.instanceId,
      ]),
    )
    .sort();
  return JSON.stringify([projectId, state]);
}

export function OrganizationProjectsView({
  organizationId,
  projects,
  projectCount,
  devices,
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError,
  fetchNextPage,
  canManage,
}: OrganizationProjectsViewProps): React.JSX.Element {
  const { t } = useLingui();
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const scrollCardRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  useInfiniteScrollSentinel(
    sentinelRef,
    {
      hasNextPage: hasNextPage && !isFetchNextPageError,
      isFetchingNextPage,
      fetchNextPage,
    },
    { rootRef: scrollCardRef, fillOnComplete: true },
  );
  const activeProject =
    projects.find(({ id }) => id === activeProjectId) ?? null;
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-3 overflow-hidden px-16 pt-10 pb-13">
      <h1
        tabIndex={-1}
        className="text-foreground-primary text-3xl leading-tight font-medium"
      >
        {t({ id: "organization.projects.title", message: "Projects" })}
      </h1>
      <OrganizationProjectStats
        projectCount={projectCount}
        summary={buildDeviceSummary(devices)}
      />
      <div className="bg-surface-basic shadow-m mt-3 min-h-0 flex-1 overflow-hidden rounded-2xl">
        <div
          ref={scrollCardRef}
          data-testid="organization-projects-scroll-card"
          className="scrollbar h-full overflow-y-auto"
        >
          <OrganizationProjectsTable
            projects={projects}
            devices={devices}
            onManageDevices={setActiveProjectId}
            canManageDevices={canManage}
            isFetchingNextPage={isFetchingNextPage}
          />
          {isFetchingNextPage ? (
            <span role="status" className="sr-only">
              {t({
                id: "organization.projects.loadingMore",
                message: "Loading more projects",
              })}
            </span>
          ) : null}
          {isFetchNextPageError ? (
            <div
              role="alert"
              className="text-foreground-secondary flex items-center justify-center gap-2 p-3 text-sm"
            >
              <span>
                {t({
                  id: "organization.projects.loadMoreFailed",
                  message: "Couldn't load more projects.",
                })}
              </span>
              <Button variant="link" onClick={fetchNextPage}>
                {t({ id: "common.action.tryAgain", message: "Try again" })}
              </Button>
            </div>
          ) : null}
          <div
            ref={sentinelRef}
            data-testid="organization-projects-sentinel"
            aria-hidden="true"
          />
        </div>
      </div>
      {activeProject ? (
        <ManageDevicesDialog
          key={deviceSnapshotKey(activeProject.id, devices)}
          organizationId={organizationId}
          project={activeProject}
          devices={devices}
          canManage={canManage}
          open
          onOpenChange={(next) => {
            if (!next) {
              setActiveProjectId(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}
