export const organizationKeys = {
  all: ["organization"] as const,
  userOrganizations: (userId?: number | null) =>
    ["organization", "user-organizations", userId ?? null] as const,
  detail: (organizationId: number) =>
    ["organization", "detail", organizationId] as const,
  projects: (organizationId: number) =>
    ["organization", organizationId, "projects"] as const,
};
