export const chatKeys = {
  conversationLists: () => ["conversations", "list"] as const,
  conversationList: (agentInstanceId: number) =>
    ["conversations", "list", { agentInstanceId }] as const,
  conversationDetails: () => ["conversations", "detail"] as const,
  conversationDetail: (id: number) => ["conversations", "detail", id] as const,
  histories: () => ["history", "messages"] as const,
  history: (agentInstanceId: number, conversationId: number | undefined) =>
    ["history", "messages", { agentInstanceId, conversationId }] as const,
  recommendationTasks: (agentInstanceId: number) =>
    ["recommendation-tasks", { agentInstanceId }] as const,
};
