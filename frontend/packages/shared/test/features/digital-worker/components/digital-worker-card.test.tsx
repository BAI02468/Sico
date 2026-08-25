import {
  type AnyRouter,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DigitalWorkerCard } from "@/features/digital-worker/components/digital-worker-card";
import {
  type Agent,
  AgentStatusSchema,
} from "@/features/digital-worker/schemas/agent";
import { ConversationRunStatusSchema } from "@/schemas/conversation-run-status";

const agent: Agent = {
  id: 5,
  name: "Chloe",
  role: "Marketing",
  project: { name: "SICO" },
  iconUri: "/storage/1/avatar.svg",
};

function renderCard(props: { agent: Agent }): void {
  const rootRoute = createRootRoute({
    component: () => <Outlet />,
  });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <DigitalWorkerCard agent={props.agent} />,
  });
  const collabRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/digital-worker/$agentId",
    component: () => <div>home</div>,
  });
  const router: AnyRouter = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, collabRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(<RouterProvider router={router} />);
}

describe("<DigitalWorkerCard>", () => {
  it("renders name, role, project name", async () => {
    renderCard({ agent });
    await screen.findByText("Chloe");
    screen.getByText("Marketing");
    screen.getByText("SICO");
  });

  it("renders avatar as decorative (empty alt; link aria-label names the worker)", async () => {
    renderCard({ agent });
    // Decorative avatar: img present with empty alt — the parent <a>
    // already carries `aria-label="Open Chloe"`, so the avatar is redundant
    // noise for screen readers (WAI-ARIA decorative image pattern).
    await screen.findByRole("link", {
      name: "Open Chloe",
    });
    const img = screen.getByTestId("avatar-fallback-image");
    expect(img).toHaveAttribute("alt", "");
  });

  it("renders as a link to the DW home with aria-label `Open {name}`", async () => {
    renderCard({ agent });
    const link = await screen.findByRole("link", {
      name: "Open Chloe",
    });
    expect(link).toHaveAttribute("href", "/digital-worker/5");
  });

  it("is keyboard reachable (focusable)", async () => {
    renderCard({ agent });
    const link = await screen.findByRole("link");
    link.focus();
    expect(link).toHaveFocus();
  });

  it("renders briefcase workspace icon when project is present", async () => {
    renderCard({ agent });
    await screen.findByTestId("workspace-icon");
  });

  it("hides workspace icon when project is missing", async () => {
    renderCard({ agent: { ...agent, project: undefined } });
    await screen.findByText("Chloe");
    expect(screen.queryByTestId("workspace-icon")).not.toBeInTheDocument();
  });

  // Status indicator (dot + same-colour label, no fill — mirrors dwp's
  // `StatusTag appearance="subtle"`). Always shown for a DW with a status.
  describe("status indicator", () => {
    it("renders the status indicator in the name row", async () => {
      renderCard({
        agent: { ...agent, status: AgentStatusSchema.enum.ACTIVE },
      });
      const label = await screen.findByText("Active");
      // The indicator must live in the name's flex row so it centers against
      // the name (not the taller avatar row). Guards the alignment fix.
      const nameRow = screen.getByText("Chloe").parentElement;
      expect(nameRow).not.toBeNull();
      expect(nameRow).toContainElement(label);
    });

    it("renders no indicator for an absent status", async () => {
      renderCard({ agent: { ...agent, status: undefined } });
      await screen.findByText("Chloe");
      expect(screen.queryByText("Active")).not.toBeInTheDocument();
      expect(screen.queryByText("Onboarding")).not.toBeInTheDocument();
    });

    it("renders Working when an active worker is running", async () => {
      renderCard({
        agent: {
          ...agent,
          status: AgentStatusSchema.enum.ACTIVE,
          conversationStatus: ConversationRunStatusSchema.enum.RUNNING,
        },
      });
      const label = await screen.findByText("Working");
      expect(label).toHaveClass("text-status-info-foreground");
    });

    it("keeps the independent New dot while running", async () => {
      renderCard({
        agent: {
          ...agent,
          status: AgentStatusSchema.enum.NEW,
          conversationStatus: ConversationRunStatusSchema.enum.RUNNING,
        },
      });
      const dot = await screen.findByTestId("new-status-dot");
      expect(dot).toHaveAttribute("aria-hidden", "true");
    });
  });
});
