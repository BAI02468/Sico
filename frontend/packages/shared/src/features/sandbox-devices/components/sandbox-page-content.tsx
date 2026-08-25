import { useLingui } from "@lingui/react/macro";
import {
  Button,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@sico/ui";
import { Search } from "lucide-react";
import { useState } from "react";
import type * as React from "react";

import { AssignDeviceDialog } from "./assign-device-dialog";
import { SandboxBody } from "./sandbox-body";
import { type Device, useProjectDevicesSuspenseQuery } from "../../devices";
import { ProjectPageHeader } from "../../projects/components/project-page-header";
import { useProjectDetailQuery } from "../../projects/hooks/use-project-query";
import { useProjectPermission } from "../../rbac";

export type SandboxPageContentProps = {
  projectId: number;
  onBack: () => void;
};

// Device lifecycle filter, driven by the toolbar pill tabs.
type StatusFilter = "all" | "available" | "assigned";

const STATUS_FILTERS = ["all", "available", "assigned"] as const;

type ToolbarCopy = {
  tabs: Record<StatusFilter, string>;
  search: string;
};

/** Sandbox-route body (under the page-level suspense/error boundary): the header,
 * the status-filter toolbar + search, and the card-wrapped device table. Owns the
 * filter/search UI state and the assign-dialog target. */
export function SandboxPageContent({
  projectId,
  onBack,
}: SandboxPageContentProps): React.JSX.Element {
  const { t } = useLingui();
  const project = useProjectDetailQuery(projectId).data;
  const devices = useProjectDevicesSuspenseQuery(projectId);
  const { canManageProject, isLoading: permissionLoading } =
    useProjectPermission(projectId);
  // Hide the assign affordance until the permission query settles — a
  // pending/errored fetch must not read as a confirmed non-admin.
  const canAssign = !permissionLoading && canManageProject;
  const [assigning, setAssigning] = useState<Device | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const devicesLabel = t({
    id: "sandboxDevices.page.title",
    message: "Devices",
  });

  const filtered = filterDevices(devices.data, status, query);

  return (
    <>
      <ProjectPageHeader
        label={project.name}
        current={devicesLabel}
        onBack={onBack}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-6 px-5 pt-11 pb-10 lg:px-16">
        <h1
          tabIndex={-1}
          className="text-foreground-primary text-3xl leading-tight font-medium outline-none"
        >
          {devicesLabel}
        </h1>
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          {renderToolbar({
            status,
            onStatusChange: setStatus,
            query,
            onQueryChange: setQuery,
            searchOpen,
            onSearchOpenChange: setSearchOpen,
            copy: {
              tabs: {
                all: t({ id: "sandboxDevices.filter.all", message: "All" }),
                available: t({
                  id: "sandboxDevices.filter.available",
                  message: "Available",
                }),
                assigned: t({
                  id: "sandboxDevices.filter.assigned",
                  message: "Assigned",
                }),
              },
              search: t({
                id: "sandboxDevices.search.label",
                message: "Search devices",
              }),
            },
          })}
          <div className="bg-surface-basic shadow-m min-h-0 flex-1 overflow-hidden rounded-2xl">
            <div className="scrollbar h-full overflow-y-auto">
              <SandboxBody
                devices={filtered}
                isFiltered={status !== "all" || query.trim() !== ""}
                canAssign={canAssign}
                onAssign={setAssigning}
              />
            </div>
          </div>
        </div>
      </div>
      <AssignDeviceDialog
        open={assigning !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAssigning(null);
          }
        }}
        projectId={projectId}
        device={assigning}
      />
    </>
  );
}

// The status-filter pill tabs + collapsible search row. A plain module-scope
// render helper (NOT a nested component) so the page body stays under the line
// cap and `react/no-unstable-nested-components` never fires.
function renderToolbar({
  status,
  onStatusChange,
  query,
  onQueryChange,
  searchOpen,
  onSearchOpenChange,
  copy,
}: {
  status: StatusFilter;
  onStatusChange: (next: StatusFilter) => void;
  query: string;
  onQueryChange: (next: string) => void;
  searchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;
  copy: ToolbarCopy;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4">
      <Tabs
        value={status}
        onValueChange={(value) => {
          // `value` always comes from STATUS_FILTERS, but narrow it explicitly
          // rather than asserting so an unknown value is a safe no-op.
          const match = STATUS_FILTERS.find((filter) => filter === value);
          if (match) {
            onStatusChange(match);
          }
        }}
      >
        <TabsList variant="pill">
          {STATUS_FILTERS.map((filter) => (
            <TabsTrigger key={filter} value={filter}>
              {copy.tabs[filter]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {searchOpen ? (
        <InputGroup className="w-64">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            aria-label={copy.search}
            placeholder={copy.search}
            // eslint-disable-next-line jsx-a11y/no-autofocus -- focus the field the user just revealed via the search toggle
            autoFocus
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onBlur={() => {
              if (query.trim() === "") {
                onSearchOpenChange(false);
              }
            }}
          />
        </InputGroup>
      ) : (
        <Button
          variant="subtle"
          size="icon-sm"
          aria-label={copy.search}
          onClick={() => onSearchOpenChange(true)}
        >
          <Search />
        </Button>
      )}
    </div>
  );
}

// Apply the lifecycle tab + name search to the device list. `available` is the
// absence of the `assigned` status so any non-assigned lifecycle still shows.
function filterDevices(
  devices: Device[],
  status: StatusFilter,
  query: string,
): Device[] {
  const q = query.trim().toLowerCase();
  return devices.filter((device) => {
    const assigned = device.status.toLowerCase() === "assigned";
    const matchesStatus =
      status === "all" || (status === "assigned" ? assigned : !assigned);
    const name = (device.displayName || device.sandboxId).toLowerCase();
    const matchesQuery = q === "" || name.includes(q);
    return matchesStatus && matchesQuery;
  });
}
