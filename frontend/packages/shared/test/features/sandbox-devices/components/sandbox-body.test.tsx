import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { type Device } from "@/features/devices/schemas/device";
import { SandboxBody } from "@/features/sandbox-devices/components/sandbox-body";

// Stub the table so the empty-state branches are what we assert.
vi.mock("@/features/sandbox-devices/components/devices-table", () => ({
  DevicesTable: () => <div>devices-table</div>,
}));

function makeDevice(partial: Partial<Device> = {}): Device {
  return {
    sandboxId: "s1",
    displayName: "Nova",
    type: "emulator",
    status: "available",
    allocatable: true,
    organizationId: 9,
    projectId: 7,
    instanceId: "",
    instanceName: "",
    vncUrl: "",
    ...partial,
  };
}

describe("SandboxBody", () => {
  it("shows the project-empty copy when unfiltered and empty", () => {
    render(
      <SandboxBody
        devices={[]}
        isFiltered={false}
        canAssign={false}
        onAssign={vi.fn()}
      />,
    );
    expect(screen.getByText("No devices yet")).toBeInTheDocument();
    expect(
      screen.getByText("This project has no devices."),
    ).toBeInTheDocument();
  });

  it("shows the no-matches copy when a filter emptied the list", () => {
    render(
      <SandboxBody
        devices={[]}
        isFiltered
        canAssign={false}
        onAssign={vi.fn()}
      />,
    );
    expect(screen.getByText("No matching devices")).toBeInTheDocument();
    expect(
      screen.getByText(/No devices match the current filter/),
    ).toBeInTheDocument();
  });

  it("renders the table when there are devices", () => {
    render(
      <SandboxBody
        devices={[makeDevice()]}
        isFiltered={false}
        canAssign={false}
        onAssign={vi.fn()}
      />,
    );
    expect(screen.getByText("devices-table")).toBeInTheDocument();
  });
});
