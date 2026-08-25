export const deviceKeys = {
  project: (projectId: number) =>
    ["sandbox-devices", "list", projectId] as const,
  organization: (organizationId: number) =>
    ["organization", organizationId, "devices"] as const,
};
