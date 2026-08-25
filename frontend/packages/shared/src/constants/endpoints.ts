// Central registry of backend endpoint paths. Every `apiClient` call reads its
// path from here so a route rename is a one-line change and a typo can't hide in
// a string literal. Most paths are axios-relative — the apiClient baseURL
// (`API_BASE_URL`) is prepended. Grouped by resource; a path reused across
// services (e.g. `/agent/single_agent` for get/create/update) is defined once.
//
// The one exception is `CHAT_STREAM_ENDPOINTS`: the SSE streams bypass axios
// (raw fetch, no baseURL), so those URLs embed `API_BASE_URL` themselves —
// hence the separate, already-absolute group at the bottom.

// The single backend origin prefix. The app's axios `baseURL` imports this too,
// so the REST client and the raw SSE URLs can never drift apart.
export const API_BASE_URL = "/api/sico";

export const AGENT_ENDPOINTS = {
  roles: "/agent/roles",
  singleAgent: "/agent/single_agent",
  singleAgentPublish: "/agent/single_agent/publish",
  singleAgentInfos: "/agent/single_agent_infos",
  singleAgents: "/agent/single_agents",
  singleAgentInstance: "/agent/single_agent_instance",
  singleAgentInstances: "/agent/single_agent_instances",
  singleAgentInstanceDismiss: "/agent/single_agent_instance/dismiss",
  singleAgentInstanceReassign: "/agent/single_agent_instance/reassign",
  singleAgentInstanceStatus: "/agent/single_agent_instance/status",
} as const;

export const CONVERSATION_ENDPOINTS = {
  root: "/conversation",
  list: "/conversation/list",
  messages: "/conversation/messages",
  plan: "/conversation/plan",
  planCancel: "/conversation/plan/cancel",
  recommendationTasks: "/conversation/onboard/recommendation_tasks",
} as const;

export const SKILL_ENDPOINTS = {
  root: "/skills",
  list: "/skills/list",
  status: "/skills/status",
} as const;

export const PROJECT_ENDPOINTS = {
  root: "/project",
  list: "/project/list",
  userProjects: "/project/user_projects",
  asset: "/project/asset",
  assetUploadUrl: "/project/asset/upload_url",
  assetComplete: "/project/asset/complete",
  deliverable: "/project/deliverable",
  deliverables: "/project/deliverables",
} as const;

export const KNOWLEDGE_ENDPOINTS = {
  tag: "/knowledge/tag",
  tags: "/knowledge/tags",
  items: "/knowledge/items",
  document: "/knowledge/document",
  documents: "/knowledge/documents",
  documentDetails: "/knowledge/document/details",
  playbook: "/knowledge/playbook",
  playbooks: "/knowledge/playbooks",
  playbookDetails: "/knowledge/playbook/details",
} as const;

export const SANDBOX_ENDPOINTS = {
  instance: "/sandbox/instance",
  list: "/sandbox/list",
  assign: "/sandbox/assign",
  projectAssign: "/sandbox/project/assign",
  projectUnassign: "/sandbox/project/unassign",
  emulatorAppsList: "/sandbox/emulator/apps/list",
  emulatorAppsInstall: "/sandbox/emulator/apps/install",
  emulatorAppsUninstall: "/sandbox/emulator/apps/uninstall",
  emulatorAppsTasks: "/sandbox/emulator/apps/tasks",
} as const;

export const ORGANIZATION_ENDPOINTS = {
  root: "/organization",
  list: "/organization/user_organizations",
} as const;

export const SCHEDULED_TASK_ENDPOINTS = {
  root: "/scheduled-tasks",
  list: "/scheduled-tasks/list",
} as const;

export const RBAC_ENDPOINTS = {
  login: "/rbac/login",
  logout: "/rbac/logout",
  user: "/rbac/user",
  userRole: "/rbac/user_role",
  userRoles: "/rbac/user_roles",
  roleUsers: "/rbac/role_users",
  users: "/rbac/users",
} as const;

// Absolute SSE stream URLs. These bypass axios (raw fetch), so unlike every
// group above they embed `API_BASE_URL` rather than relying on the apiClient
// baseURL.
export const CHAT_STREAM_ENDPOINTS = {
  chat: `${API_BASE_URL}/conversation/chat`,
  reconnect: `${API_BASE_URL}/conversation/chat/reconnect`,
} as const;
