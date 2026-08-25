import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const createAgent = vi.fn();
const navigate = vi.fn().mockResolvedValue(undefined);

vi.mock("@/features/skill", () => ({
  useRolesSuspenseQuery: () => ({ data: [] }),
}));

vi.mock("@/features/studio/components/studio-setup-editor", () => ({
  StudioSetupEditor: ({
    onBasicSave,
    onCreated,
  }: {
    onBasicSave: (values: { name: string; role: string }) => Promise<void>;
    onCreated?: (
      agentId: string,
      drafts: [],
      openPublishAfterTransition: boolean,
    ) => Promise<void>;
  }) => (
    <>
      <button
        type="button"
        onClick={() => {
          void onBasicSave({ name: "Atlas", role: "Researcher" });
        }}
      >
        Save
      </button>
      <button
        type="button"
        onClick={() => {
          void (async () => {
            await onBasicSave({ name: "Atlas", role: "Researcher" });
            await onCreated?.("agent-1", [], true);
          })();
        }}
      >
        Publish
      </button>
    </>
  ),
}));

vi.mock("@/features/studio/hooks/use-single-agent-mutations", () => ({
  useCreateSingleAgentMutation: () => ({ mutateAsync: createAgent }),
}));

vi.mock("@/hooks/use-bound-organization", () => ({
  useBoundOrganizationSuspenseQuery: () => ({ data: { id: 42 } }),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
}));

vi.mock("@sico/ui", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const { CreateSetupBody } =
  await import("@/features/studio/components/create-setup-body");

describe("CreateSetupBody", () => {
  it("creates the agent in the bound organization", async () => {
    createAgent.mockResolvedValue({ agentId: "agent-1" });
    const user = userEvent.setup();

    render(
      <I18nProvider i18n={i18n}>
        <CreateSetupBody />
      </I18nProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(createAgent).toHaveBeenCalledWith({
      name: "Atlas",
      role: "Researcher",
      organizationId: 42,
    });
  });

  it("hands Create Publish through to Edit with the Publish intent", async () => {
    createAgent.mockResolvedValue({ agentId: "agent-1" });
    const user = userEvent.setup();

    render(
      <I18nProvider i18n={i18n}>
        <CreateSetupBody />
      </I18nProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: "/studio/$agentId/setup",
        params: { agentId: "agent-1" },
        replace: true,
      }),
    );
  });
});
