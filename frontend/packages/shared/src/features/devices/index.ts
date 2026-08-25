export {
  type Device,
  deviceSchema,
  type DeviceListData,
  deviceListDataSchema,
  DEVICE_TYPES,
  flattenDeviceGroups,
} from "./schemas/device";
export { deviceKeys } from "./query-keys";
export {
  type AssignDeviceInput,
  assignDevice,
  assignProjectDevices,
  type DeviceListScope,
  fetchDevices,
  unassignProjectDevices,
} from "./services/devices";
export {
  type ProjectDeviceAllocationInput,
  updateProjectDeviceAllocation,
} from "./services/project-device-allocation";
export {
  projectDevicesQueryOptions,
  useProjectDevicesQuery,
  useProjectDevicesSuspenseQuery,
} from "./hooks/use-project-devices-query";
export {
  organizationDevicesQueryOptions,
  useOrganizationDevicesQuery,
} from "./hooks/use-organization-devices-query";
export {
  buildDeviceSummary,
  categoryForDevice,
  type DeviceCategory,
  type DeviceCounts,
  type DeviceSummary,
  getAllocationBounds,
  planDeviceAllocation,
  projectDeviceCounts,
} from "./utils/device-allocation";
