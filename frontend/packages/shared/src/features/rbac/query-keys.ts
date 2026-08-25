export const rbacKeys = {
  all: ["rbac"] as const,
  userRoles: (userId: number | null) => ["rbac", "user-roles", userId] as const,
};
