export const membershipKeys = {
  project: (projectId: number) => ["project-members", projectId] as const,
  organization: (organizationId: number) =>
    ["organization", organizationId, "members"] as const,
};
