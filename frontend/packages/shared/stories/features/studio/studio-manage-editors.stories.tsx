import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios, { type AxiosAdapter } from "axios";
import { type ReactElement, useMemo, useState } from "react";

import { RBAC_ENDPOINTS } from "@/constants/endpoints";
import { StudioManageEditorsDialog } from "@/features/studio/components/studio-manage-editors-dialog";
import { makeOkEnvelope } from "@/schemas/api";
import { ApiClientProvider } from "@/services/api-client-context";

const agentId = "a3c0bc10-6d1c-4b33-a866-f3e1b2b91cde";
const editors = [
  { id: 2, email: "editor@example.com", alias: "Editor" },
  { id: 3, email: "reviewer@example.com", alias: "Reviewer" },
];

type StoryArgs = { state: "Populated" | "Empty" | "Pending" | "Error" };

if (!i18n.locale) {
  i18n.loadAndActivate({ locale: "en", messages: {} });
}

function createStoryAdapter(state: StoryArgs["state"]): AxiosAdapter {
  return async (config) => {
    if (config.url !== RBAC_ENDPOINTS.roleUsers) {
      throw new Error(`Unhandled story request: ${config.url}`);
    }
    if (state === "Pending") {
      return new Promise(() => {});
    }
    if (state === "Error") {
      throw new Error("Editor roster is unavailable in this story.");
    }
    const users = state === "Populated" ? editors : [];
    return {
      config,
      data: makeOkEnvelope({ users, total: users.length, hasNext: false }),
      headers: {},
      status: 200,
      statusText: "OK",
    };
  };
}

function StoryFrame({ state }: StoryArgs): ReactElement {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
          mutations: { retry: false },
        },
      }),
  );
  const apiClient = useMemo(
    () => axios.create({ adapter: createStoryAdapter(state) }),
    [state],
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={apiClient}>
        <StudioManageEditorsDialog
          agentId={agentId}
          creatorUsername="owner@example.com"
          open
          onOpenChange={() => undefined}
        />
      </ApiClientProvider>
    </QueryClientProvider>
  );
}

const meta: Meta<StoryArgs> = {
  title: "Studio/ManageEditors",
  decorators: [
    (Story) => (
      <I18nProvider i18n={i18n}>
        <Story />
      </I18nProvider>
    ),
  ],
  parameters: {
    layout: "centered",
    docs: { source: { code: "<StudioManageEditorsDialog />" } },
  },
  args: { state: "Populated" },
  render: ({ state }) => <StoryFrame key={state} state={state} />,
};

export default meta;
type Story = StoryObj<StoryArgs>;

/** The complete dialog with creator and assigned-editor removal actions. */
export const Populated: Story = {};

/** The complete dialog before any additional editor has been assigned. */
export const Empty: Story = { args: { state: "Empty" } };

/** The complete dialog while the roster loads and invitations stay disabled. */
export const Pending: Story = { args: { state: "Pending" } };

/** The complete dialog with roster failure feedback and its Retry action. */
export const LoadError: Story = { args: { state: "Error" } };
