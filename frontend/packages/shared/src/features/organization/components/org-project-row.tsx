import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  TableCell,
  TableRow,
} from "@sico/ui";
import { Ellipsis } from "lucide-react";
import type * as React from "react";

import { ProjectAvatar } from "../../../components/project-avatar/project-avatar";
import { normalizeEpochMilliseconds } from "../../../utils/normalize-epoch-milliseconds";
import { type DeviceCounts } from "../../devices";
import { GatedMenuItem } from "../../projects/components/gated-menu-item";
import { type OrganizationProject } from "../../projects/schemas/project";

export function OrgProjectRow({
  project,
  counts,
  canManageDevices,
  onManageDevices,
}: {
  project: OrganizationProject;
  counts: DeviceCounts;
  canManageDevices: boolean;
  onManageDevices: () => void;
}): React.JSX.Element {
  const { t, i18n } = useLingui();
  return (
    <TableRow className="h-14">
      <TableCell className="text-foreground-primary px-6">
        <span className="flex min-w-0 items-center gap-2">
          <ProjectAvatar project={project} decorative size="xs" />
          <span className="truncate font-medium">{project.name}</span>
        </span>
      </TableCell>
      <TableCell className="text-foreground-secondary px-6 text-sm">
        {project.ownerUsername}
      </TableCell>
      <TableCell className="px-6">
        <span className="flex flex-wrap items-center gap-1.5">
          {counts.mobile > 0 ? (
            <Badge color="green">
              {t({
                id: "organization.projects.mobileCount",
                message: plural(counts.mobile, {
                  one: "Mobile #",
                  other: "Mobile #",
                }),
              })}
            </Badge>
          ) : null}
          {counts.windows > 0 ? (
            <Badge color="blue">
              {t({
                id: "organization.projects.windowsCount",
                message: plural(counts.windows, {
                  one: "Windows #",
                  other: "Windows #",
                }),
              })}
            </Badge>
          ) : null}
          {counts.mobile + counts.windows === 0 ? (
            <span className="text-foreground-tertiary text-sm">—</span>
          ) : null}
        </span>
      </TableCell>
      <TableCell className="text-foreground-secondary px-6 text-sm">
        {i18n.date(normalizeEpochMilliseconds(project.createdAt))}
      </TableCell>
      <TableCell className="px-6 text-end">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="subtle"
                size="icon-xs"
                aria-label={t({
                  id: "organization.projects.actions",
                  message: "Project actions",
                })}
              />
            }
          >
            <Ellipsis aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="!w-40">
            <GatedMenuItem
              allowed={canManageDevices}
              deniedTooltip={t({
                id: "organization.projects.manageDevicesOrgAdminOnly",
                message: "Available to Organization Owners and Admins only.",
              })}
              onSelect={onManageDevices}
            >
              {t({
                id: "organization.projects.manageDevices",
                message: "Manage Devices",
              })}
            </GatedMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
