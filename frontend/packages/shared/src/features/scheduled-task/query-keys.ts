export const scheduledTaskKeys = {
  all: ["scheduled-tasks"] as const,
  lists: () => ["scheduled-tasks", "list"] as const,
  list: (pageSize: number) =>
    ["scheduled-tasks", "list", { pageSize }] as const,
  details: () => ["scheduled-tasks", "detail"] as const,
  detail: (id: number) => ["scheduled-tasks", "detail", id] as const,
};
