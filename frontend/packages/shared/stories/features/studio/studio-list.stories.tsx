import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import type { ReactElement } from "react";

import { StudioCard } from "@/features/studio/components/studio-card";
import { StudioEmpty } from "@/features/studio/components/studio-empty";
import { StudioGridSkeleton } from "@/features/studio/components/studio-grid-skeleton";
import type { StudioAgent } from "@/features/studio/schemas/studio-agent";

if (!i18n.locale) {
  i18n.loadAndActivate({ locale: "en", messages: {} });
}

const draftAgent: StudioAgent = {
  agentId: "a3c0bc10-6d1c-4b33-a866-f3e1b2b91cde",
  name: "Max",
  role: "Researcher",
  desc: "",
  creatorUsername: "owner@example.com",
  organizationId: 9,
  publishStatus: 0,
};

const publishedAgent: StudioAgent = {
  ...draftAgent,
  agentId: "ee19cdb4-fbd6-4b70-8c4c-bd10d5fa3f51",
  name: "Ada",
  publishStatus: 1,
};

function CardList({ agents }: { agents: StudioAgent[] }): ReactElement {
  return (
    <div className="grid max-w-180 grid-cols-2 gap-4 p-6">
      {agents.map((agent) => (
        <StudioCard key={agent.agentId} agent={agent} />
      ))}
    </div>
  );
}

function StudioCardStoryRoot(): ReactElement {
  return <CardList agents={[draftAgent, publishedAgent]} />;
}

function StudioRouteFrame(): ReactElement {
  const rootRoute = createRootRoute({ component: StudioCardStoryRoot });
  const setupRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/studio/$agentId/setup",
    component: () => null,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([setupRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });

  return <RouterProvider router={router} />;
}

type StoryArgs = { state: "agents" | "empty" | "loading" };

const meta: Meta<StoryArgs> = {
  title: "Studio/List",
  decorators: [
    (Story) => (
      <I18nProvider i18n={i18n}>
        <Story />
      </I18nProvider>
    ),
  ],
  parameters: {
    layout: "fullscreen",
    docs: { source: { code: "<Studio />" } },
  },
  args: { state: "agents" },
  render: ({ state }) => {
    if (state === "empty") {
      return <StudioEmpty />;
    }
    if (state === "loading") {
      return <StudioGridSkeleton />;
    }
    return <StudioRouteFrame />;
  },
};

export default meta;
type Story = StoryObj<StoryArgs>;

/** Organization-visible agents show draft and published status side by side. */
export const Agents: Story = {};

/** Empty organization list keeps the creation next step visible. */
export const Empty: Story = { args: { state: "empty" } };

/** Pending organization list reserves the final card layout. */
export const Loading: Story = { args: { state: "loading" } };
