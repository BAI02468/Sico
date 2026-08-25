import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchRoles } from "@/features/skill/services/roles";
import { fetchSkills } from "@/features/skill/services/skills";
import { AgentSetupPage } from "@/features/studio/components/agent-setup-page";
import { CreateSetupPage } from "@/features/studio/components/create-setup-page";
import { fetchSingleAgent } from "@/features/studio/services/single-agents";
import { ApiClientProvider } from "@/services/api-client-context";

vi.mock("@/features/skill/services/roles");
vi.mock("@/features/skill/services/skills");
vi.mock("@/features/studio/services/single-agents");
vi.mock("@/hooks/use-bound-organization", () => ({
  useBoundOrganizationSuspenseQuery: () => ({ data: { id: 9 } }),
}));

const mockFetchRoles = vi.mocked(fetchRoles);
const mockFetchSkills = vi.mocked(fetchSkills);
const mockFetchSingleAgent = vi.mocked(fetchSingleAgent);

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve: ((value: T) => void) | undefined;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  if (!resolve) {
    throw new Error("Promise executor did not initialize resolve");
  }
  return { promise, resolve };
}

function renderSetupPage(
  initialPath: "/studio/setup" | "/studio/agent-1/setup",
): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const apiClient = axios.create({ baseURL: "/api/sico" });
  const rootRoute = createRootRoute();
  const studioRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/studio",
    component: () => <div>Studio</div>,
  });
  const createSetupRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/studio/setup",
    component: CreateSetupPage,
  });
  const agentSetupRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/studio/$agentId/setup",
    component: () => <AgentSetupPage agentId="agent-1" />,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      studioRoute,
      createSetupRoute,
      agentSetupRoute,
    ]),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });

  render(
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={apiClient}>
        <RouterProvider router={router} />
      </ApiClientProvider>
    </QueryClientProvider>,
  );
}

async function renderAgentWithOnlyRolesPending(): Promise<void> {
  const agent = createDeferred<Awaited<ReturnType<typeof fetchSingleAgent>>>();
  const skills = createDeferred<Awaited<ReturnType<typeof fetchSkills>>>();
  mockFetchRoles.mockImplementation(() => new Promise(() => {}));
  mockFetchSingleAgent.mockReturnValue(agent.promise);
  mockFetchSkills.mockReturnValue(skills.promise);

  renderSetupPage("/studio/agent-1/setup");
  await screen.findByRole("status", { name: "Loading digital worker setup" });

  await act(async () => {
    agent.resolve({
      agentId: "agent-1",
      name: "Max",
      role: "Researcher",
    });
    skills.resolve({ items: [], total: 0, hasNext: false });
    await Promise.all([agent.promise, skills.promise]);
  });
}

beforeEach(() => {
  mockFetchRoles.mockReset();
  mockFetchSkills.mockReset();
  mockFetchSingleAgent.mockReset();
  mockFetchSingleAgent.mockResolvedValue({
    agentId: "agent-1",
    name: "Max",
    role: "Researcher",
  });
  mockFetchSkills.mockResolvedValue({ items: [], total: 0, hasNext: false });
});

describe("<CreateSetupPage> roles boundary", () => {
  it("keeps one setup heading while roles are pending", async () => {
    mockFetchRoles.mockImplementation(() => new Promise(() => {}));

    renderSetupPage("/studio/setup");

    expect(
      await screen.findAllByRole("heading", {
        level: 1,
        name: "Digital Worker Setup",
      }),
    ).toHaveLength(1);
  });

  it("hides Basic Info while roles are pending", async () => {
    mockFetchRoles.mockImplementation(() => new Promise(() => {}));

    renderSetupPage("/studio/setup");
    await screen.findByRole("heading", {
      level: 1,
      name: "Digital Worker Setup",
    });

    expect(
      screen.queryByRole("heading", { level: 2, name: "BASIC INFO" }),
    ).toBeNull();
  });

  it("does not show an edit setup skeleton while roles are pending", async () => {
    mockFetchRoles.mockImplementation(() => new Promise(() => {}));

    renderSetupPage("/studio/setup");
    await screen.findByRole("heading", {
      level: 1,
      name: "Digital Worker Setup",
    });

    expect(
      screen.queryByRole("status", { name: "Loading digital worker setup" }),
    ).toBeNull();
  });

  it("shows content loading while roles are pending", async () => {
    mockFetchRoles.mockImplementation(() => new Promise(() => {}));

    renderSetupPage("/studio/setup");

    expect(
      await screen.findByRole("status", {
        name: "Loading digital worker setup form",
      }),
    ).toBeVisible();
  });

  it("keeps the setup heading visible when roles fail", async () => {
    mockFetchRoles.mockRejectedValue(new Error("roles failed"));

    renderSetupPage("/studio/setup");
    await screen.findByRole("alert");

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Digital Worker Setup",
      }),
    ).toBeVisible();
  });

  it("shows the existing alert when roles fail", async () => {
    mockFetchRoles.mockRejectedValue(new Error("roles failed"));

    renderSetupPage("/studio/setup");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong",
    );
  });

  it("recovers the form after retrying roles", async () => {
    mockFetchRoles
      .mockRejectedValueOnce(new Error("roles failed"))
      .mockResolvedValueOnce([{ name: "Researcher", value: "Researcher" }]);
    const user = userEvent.setup();

    renderSetupPage("/studio/setup");
    await user.click(await screen.findByRole("button", { name: "Try again" }));

    expect(
      await screen.findByRole("heading", { level: 2, name: "BASIC INFO" }),
    ).toBeVisible();
  });
});

describe("<AgentSetupPage> roles boundary", () => {
  it("shows exactly one setup loading status while roles are pending", async () => {
    await renderAgentWithOnlyRolesPending();

    expect(
      screen.getAllByRole("status", {
        name: "Loading digital worker setup",
      }),
    ).toHaveLength(1);
  });

  it("does not show the Studio loading status while roles are pending", async () => {
    await renderAgentWithOnlyRolesPending();

    expect(screen.queryByRole("status", { name: "Loading Studio" })).toBeNull();
  });

  it("hides Basic Info while only roles are pending", async () => {
    await renderAgentWithOnlyRolesPending();

    expect(
      screen.queryByRole("heading", { level: 2, name: "BASIC INFO" }),
    ).toBeNull();
  });

  it("shows the existing alert when roles fail", async () => {
    mockFetchRoles.mockRejectedValue(new Error("roles failed"));

    renderSetupPage("/studio/agent-1/setup");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong",
    );
  });

  it("recovers the form after retrying roles", async () => {
    mockFetchRoles
      .mockRejectedValueOnce(new Error("roles failed"))
      .mockResolvedValueOnce([{ name: "Researcher", value: "Researcher" }]);
    const user = userEvent.setup();

    renderSetupPage("/studio/agent-1/setup");
    await user.click(await screen.findByRole("button", { name: "Try again" }));

    expect(
      await screen.findByRole("heading", { level: 2, name: "BASIC INFO" }),
    ).toBeVisible();
  });
});
