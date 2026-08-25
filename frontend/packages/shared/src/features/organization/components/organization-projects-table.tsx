import { useLingui } from "@lingui/react/macro";
import {
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@sico/ui";
import type * as React from "react";

import { OrgEmpty } from "./org-empty";
import { OrgProjectRow } from "./org-project-row";
import { type Device, projectDeviceCounts } from "../../devices";
import { type OrganizationProject } from "../../projects/schemas/project";

const PROJECT_LOADING_ROW_IDS = [
  "project-loading-row-alpha",
  "project-loading-row-bravo",
  "project-loading-row-charlie",
] as const;

export function OrganizationProjectsTable({
  projects,
  devices,
  onManageDevices,
  canManageDevices,
  isFetchingNextPage,
}: {
  projects: OrganizationProject[];
  devices: Device[];
  onManageDevices: (projectId: number) => void;
  canManageDevices: boolean;
  isFetchingNextPage: boolean;
}): React.JSX.Element {
  const { t } = useLingui();
  const headers = [
    t({ id: "organization.projects.header.name", message: "Project" }),
    t({ id: "organization.projects.header.owner", message: "Owner" }),
    t({ id: "organization.projects.header.devices", message: "Devices" }),
    t({ id: "organization.projects.header.created", message: "Created" }),
  ];
  if (projects.length === 0) {
    return (
      <OrgEmpty
        illustration="projects"
        heading={t({
          id: "organization.projects.empty.heading",
          message: "No projects yet",
        })}
        body={t({
          id: "organization.projects.empty.body",
          message: "Create your first project to organize your team's work.",
        })}
      />
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-surface-basic sticky top-0 z-30 h-13 hover:bg-transparent">
          {headers.map((header) => (
            <TableHead key={header} className="h-13 px-6 text-sm">
              {header}
            </TableHead>
          ))}
          <TableHead className="h-13 px-6 text-end text-sm">
            {t({
              id: "organization.projects.header.actions",
              message: "Action",
            })}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => (
          <OrgProjectRow
            key={project.id}
            project={project}
            counts={projectDeviceCounts(devices, project.id)}
            canManageDevices={canManageDevices}
            onManageDevices={() => onManageDevices(project.id)}
          />
        ))}
        {isFetchingNextPage
          ? PROJECT_LOADING_ROW_IDS.map((rowId) => (
              <TableRow
                key={rowId}
                aria-hidden="true"
                data-testid="project-loading-more-row"
                className="h-14 hover:bg-transparent"
              >
                <TableCell className="px-6">
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell className="px-6">
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell className="px-6">
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell className="px-6">
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell className="px-6 text-end">
                  <Skeleton className="ms-auto size-6" />
                </TableCell>
              </TableRow>
            ))
          : null}
      </TableBody>
    </Table>
  );
}
