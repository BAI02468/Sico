import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as devicesService from "@/features/devices/services/devices";
import { updateProjectDeviceAllocation } from "@/features/devices/services/project-device-allocation";

vi.mock("@/features/devices/services/devices");

const client = axios.create();

beforeEach(() => {
  vi.mocked(devicesService.assignProjectDevices)
    .mockReset()
    .mockResolvedValue(undefined);
  vi.mocked(devicesService.unassignProjectDevices)
    .mockReset()
    .mockResolvedValue(undefined);
});

describe("updateProjectDeviceAllocation", () => {
  it("assigns replacements before unassigning old devices", async () => {
    const operations: string[] = [];
    vi.mocked(devicesService.assignProjectDevices).mockImplementation(() => {
      operations.push("assign");
      return Promise.resolve();
    });
    vi.mocked(devicesService.unassignProjectDevices).mockImplementation(() => {
      operations.push("unassign");
      return Promise.resolve();
    });

    await updateProjectDeviceAllocation(client, 7, {
      assignIds: ["add-1"],
      unassignIds: ["remove-1"],
    });

    expect(devicesService.assignProjectDevices).toHaveBeenCalledWith(
      client,
      7,
      ["add-1"],
    );
    expect(devicesService.unassignProjectDevices).toHaveBeenCalledWith(
      client,
      7,
      ["remove-1"],
    );
    expect(operations).toEqual(["assign", "unassign"]);
  });

  it("stops when assigning replacements fails", async () => {
    const assignError = new Error("assign failed");
    vi.mocked(devicesService.assignProjectDevices).mockRejectedValue(
      assignError,
    );

    await expect(
      updateProjectDeviceAllocation(client, 7, {
        assignIds: ["add-1"],
        unassignIds: ["remove-1"],
      }),
    ).rejects.toBe(assignError);
    expect(devicesService.unassignProjectDevices).not.toHaveBeenCalled();
  });

  it("rolls back newly assigned devices when removing old devices fails", async () => {
    const removeError = new Error("remove failed");
    vi.mocked(devicesService.unassignProjectDevices)
      .mockRejectedValueOnce(removeError)
      .mockResolvedValueOnce(undefined);

    await expect(
      updateProjectDeviceAllocation(client, 7, {
        assignIds: ["add-1"],
        unassignIds: ["remove-1"],
      }),
    ).rejects.toBe(removeError);
    expect(devicesService.unassignProjectDevices).toHaveBeenNthCalledWith(
      2,
      client,
      7,
      ["add-1"],
    );
  });

  it("aggregates the original and rollback failures", async () => {
    const removeError = new Error("remove failed");
    const rollbackError = new Error("rollback failed");
    vi.mocked(devicesService.unassignProjectDevices)
      .mockRejectedValueOnce(removeError)
      .mockRejectedValueOnce(rollbackError);

    const promise = updateProjectDeviceAllocation(client, 7, {
      assignIds: ["add-1"],
      unassignIds: ["remove-1"],
    });

    await expect(promise).rejects.toMatchObject({
      message: "remove failed",
      errors: [removeError, rollbackError],
    });
    await expect(promise).rejects.toBeInstanceOf(AggregateError);
  });
});
