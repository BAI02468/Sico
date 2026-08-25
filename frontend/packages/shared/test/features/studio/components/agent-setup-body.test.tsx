import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { toast } from "@sico/ui";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStore, Provider } from "jotai";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { studioSetupHandoffAtom } from "@/features/studio/atoms/studio-setup-handoff-atom";

const agentId = "a3c0bc10-6d1c-4b33-a866-f3e1b2b91cde";
const useAgentPermission = vi.fn();
const publishAgent = vi.fn();
const updateAgent = vi.fn().mockResolvedValue(undefined);
const navigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => (
    <a href="/studio">{children}</a>
  ),
  useBlocker: () => ({ status: "idle" }),
  useNavigate: () => navigate,
}));

vi.mock("@/features/studio/components/studio-delete-agent-dialog", () => ({
  StudioDeleteAgentDialog: ({ onDeleted }: { onDeleted: () => void }) => (
    <button type="button" onClick={onDeleted}>
      Confirm test delete
    </button>
  ),
}));

vi.mock("@/features/studio/components/studio-manage-editors-dialog", () => ({
  StudioManageEditorsDialog: ({
    agentId: dialogAgentId,
    creatorUsername,
    onOpenChange,
  }: {
    agentId: string;
    creatorUsername: string;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div>
      <p>{`Manage editors for ${dialogAgentId} by ${creatorUsername}`}</p>
      <button type="button" onClick={() => onOpenChange(false)}>
        Close test manage
      </button>
    </div>
  ),
}));

vi.mock("@/features/rbac", () => ({
  useAgentPermission,
}));

vi.mock("@/features/skill", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/skill")>()),
  useRolesSuspenseQuery: () => ({
    data: [{ name: "Tester", value: "tester" }],
  }),
  useSkillsSuspenseInfiniteQuery: () => undefined,
  SetupSkillSection: ({ editable }: { editable: boolean }) => (
    <button type="button" disabled={!editable}>
      Add skills
    </button>
  ),
}));

vi.mock("@/features/studio/hooks/use-single-agent-query", () => ({
  useSingleAgentSuspenseQuery: () => ({
    data: {
      agentId,
      name: "Visual Bot",
      role: "tester",
      creatorUsername: "owner@example.com",
      desc: "Existing description",
    },
  }),
}));

vi.mock("@/features/studio/hooks/use-single-agent-mutations", () => ({
  usePublishSingleAgentMutation: () => ({
    isPending: false,
    mutate: publishAgent,
  }),
  useUpdateSingleAgentMutation: () => ({ mutateAsync: updateAgent }),
}));

const { AgentSetupBody } =
  await import("@/features/studio/components/agent-setup-body");

describe("AgentSetupBody", () => {
  beforeEach(() => {
    publishAgent.mockReset();
    updateAgent.mockClear();
    navigate.mockReset();
    useAgentPermission.mockReturnValue({ canEdit: false, canPublish: false });
  });

  it("renders the setup editor read-only for a viewer", () => {
    render(
      <I18nProvider i18n={i18n}>
        <AgentSetupBody agentId={agentId} />
      </I18nProvider>,
    );

    expect(screen.getByRole("textbox", { name: /role name/i })).toBeDisabled();
    expect(
      screen.getByRole("combobox", { name: "Industry Type" }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Save" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add skills" })).toBeDisabled();
  });

  it("preserves the existing description during Basic Info autosave", async () => {
    useAgentPermission.mockReturnValue({ canEdit: true, canPublish: true });
    const user = userEvent.setup();
    render(
      <I18nProvider i18n={i18n}>
        <AgentSetupBody agentId={agentId} />
      </I18nProvider>,
    );

    await user.type(
      screen.getByRole("textbox", { name: /role name/i }),
      " updated",
    );
    await waitFor(() =>
      expect(updateAgent).toHaveBeenCalledWith({
        agentId,
        name: "Visual Bot updated",
        role: "tester",
        desc: "Existing description",
      }),
    );
  });

  it("opens Manage Editors with the agent owner details", async () => {
    const user = userEvent.setup();
    useAgentPermission.mockReturnValue({
      canEdit: true,
      canPublish: true,
      canManageEditors: true,
      canDelete: true,
    });
    render(
      <I18nProvider i18n={i18n}>
        <AgentSetupBody agentId={agentId} />
      </I18nProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: "More setup actions" }),
    );
    await user.click(
      await screen.findByRole("menuitem", { name: "Manage editors" }),
    );

    expect(
      screen.getByText(`Manage editors for ${agentId} by owner@example.com`),
    ).toBeVisible();
  });

  it("navigates to Studio after owner deletion succeeds", async () => {
    const user = userEvent.setup();
    useAgentPermission.mockReturnValue({
      canEdit: true,
      canPublish: true,
      canManageEditors: true,
      canDelete: true,
    });
    render(
      <I18nProvider i18n={i18n}>
        <AgentSetupBody agentId={agentId} />
      </I18nProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: "More setup actions" }),
    );
    await user.click(
      await screen.findByRole("menuitem", { name: "Delete digital worker" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirm test delete" }),
    );

    expect(navigate).toHaveBeenCalledWith({
      to: "/studio/all",
      ignoreBlocker: true,
    });
  });

  it("disables Publish for an editor without publish permission", async () => {
    useAgentPermission.mockReturnValue({ canEdit: true, canPublish: false });
    const user = userEvent.setup();
    render(
      <I18nProvider i18n={i18n}>
        <AgentSetupBody agentId={agentId} />
      </I18nProvider>,
    );

    const name = screen.getByRole("textbox", { name: /role name/i });
    expect(name).toBeEnabled();
    expect(
      screen.getByRole("combobox", { name: "Industry Type" }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "Add skills" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();

    await user.type(name, " updated");

    expect(
      screen.queryByRole("button", { name: "Save" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Saving…");
  });

  it("closes after publish success and allows another publish request", async () => {
    const user = userEvent.setup();
    const success = vi.spyOn(toast, "success");
    publishAgent.mockImplementation((_input, options) =>
      options?.onSuccess?.(),
    );
    useAgentPermission.mockReturnValue({ canEdit: true, canPublish: true });

    render(
      <I18nProvider i18n={i18n}>
        <AgentSetupBody agentId={agentId} />
      </I18nProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Publish" }));
    await screen.findByRole("dialog", { name: "Publish digital worker" });
    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(publishAgent).toHaveBeenCalledWith(
      { agentId, access: "only_me" },
      expect.any(Object),
    );
    expect(success).toHaveBeenCalledWith("Digital worker published.", {
      invert: true,
    });
    expect(
      screen.queryByRole("dialog", { name: "Publish digital worker" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(
      await screen.findByRole("dialog", { name: "Publish digital worker" }),
    ).toBeVisible();
  });

  it("retains the dialog and access selection after publish failure", async () => {
    const user = userEvent.setup();
    const error = vi.spyOn(toast, "error");
    publishAgent.mockImplementation((_input, options) => options?.onError?.());
    useAgentPermission.mockReturnValue({ canEdit: true, canPublish: true });

    render(
      <I18nProvider i18n={i18n}>
        <AgentSetupBody agentId={agentId} />
      </I18nProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Publish" }));
    await screen.findByRole("dialog", { name: "Publish digital worker" });
    await user.click(screen.getByLabelText("Access"));
    await user.click(await screen.findByText("My organization"));
    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(error).toHaveBeenCalledWith("Couldn't publish this digital worker.");
    expect(screen.getByLabelText("Access")).toHaveTextContent(
      "My organization",
    );
    expect(
      screen.getByRole("dialog", { name: "Publish digital worker" }),
    ).toBeVisible();
  });

  it("opens Publish once after the Create-to-Edit handoff", async () => {
    const store = createStore();
    store.set(
      studioSetupHandoffAtom,
      new Map([[agentId, { drafts: [], openPublishAfterTransition: true }]]),
    );
    useAgentPermission.mockReturnValue({ canEdit: true, canPublish: true });

    render(
      <Provider store={store}>
        <I18nProvider i18n={i18n}>
          <AgentSetupBody agentId={agentId} />
        </I18nProvider>
      </Provider>,
    );

    await screen.findByRole("dialog", { name: "Publish digital worker" });
    await waitFor(() =>
      expect(store.get(studioSetupHandoffAtom).has(agentId)).toBe(false),
    );

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Cancel" }));

    expect(
      screen.queryByRole("dialog", { name: "Publish digital worker" }),
    ).not.toBeInTheDocument();
  });

  it("preserves a Publish handoff until permission resolution allows publishing", async () => {
    const store = createStore();
    store.set(
      studioSetupHandoffAtom,
      new Map([[agentId, { drafts: [], openPublishAfterTransition: true }]]),
    );
    useAgentPermission.mockReturnValue({
      canEdit: false,
      canPublish: false,
      isLoading: true,
      isError: false,
    });

    const view = render(
      <Provider store={store}>
        <I18nProvider i18n={i18n}>
          <AgentSetupBody agentId={agentId} />
        </I18nProvider>
      </Provider>,
    );

    expect(
      screen.queryByRole("dialog", { name: "Publish digital worker" }),
    ).not.toBeInTheDocument();
    expect(store.get(studioSetupHandoffAtom).has(agentId)).toBe(true);

    useAgentPermission.mockReturnValue({
      canEdit: true,
      canPublish: true,
      isLoading: false,
      isError: false,
    });
    view.rerender(
      <Provider store={store}>
        <I18nProvider i18n={i18n}>
          <AgentSetupBody agentId={agentId} />
        </I18nProvider>
      </Provider>,
    );

    expect(
      await screen.findByRole("dialog", { name: "Publish digital worker" }),
    ).toBeVisible();
    await waitFor(() =>
      expect(store.get(studioSetupHandoffAtom).has(agentId)).toBe(false),
    );
  });
});
