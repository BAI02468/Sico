import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StudioCard } from "@/features/studio/components/studio-card";
import {
  SingleAgentPublishStatusSchema,
  type StudioAgent,
} from "@/features/studio/schemas/studio-agent";

const agent: StudioAgent = {
  agentId: "agent-7",
  name: "Ryan",
  role: "Engineer",
  desc: "Researches",
  creatorUsername: "alice",
  organizationId: 7,
  publishStatus: SingleAgentPublishStatusSchema.enum.DRAFT,
};

function renderCard(props: { agent: StudioAgent }): void {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <StudioCard agent={props.agent} />,
  });
  const setupRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/studio/$agentId/setup",
    component: () => <div>setup</div>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, setupRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(<RouterProvider router={router} />);
}

describe("<StudioCard>", () => {
  it("renders the full-list name and creator without a status badge", async () => {
    renderCard({ agent });

    await screen.findByText("Ryan");
    screen.getByText("alice");
    expect(screen.queryByText("Draft")).not.toBeInTheDocument();
    expect(screen.queryByText("Published")).not.toBeInTheDocument();
  });

  it("links to the agent's setup page using the string agentId", async () => {
    renderCard({ agent });
    const link = await screen.findByRole("link", {
      name: "Open Ryan's setup",
    });
    expect(link).toHaveAttribute("href", "/studio/agent-7/setup");
  });

  it("renders the initial-based avatar (uppercased first letter)", async () => {
    renderCard({ agent });
    await screen.findByRole("link", { name: "Open Ryan's setup" });
    expect(screen.getByText("R")).toBeInTheDocument();
  });

  it("is keyboard reachable (focusable)", async () => {
    renderCard({ agent });
    const link = await screen.findByRole("link");
    link.focus();
    expect(link).toHaveFocus();
  });
});
