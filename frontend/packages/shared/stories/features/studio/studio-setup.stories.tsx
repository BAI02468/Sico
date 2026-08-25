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
import { useForm } from "react-hook-form";

import { SetupBasicInfo } from "@/features/skill/components/setup/setup-basic-info";
import type { SetupBasicInfoValues } from "@/features/skill/components/setup/setup-basic-info-values";
import { StudioAutosaveStatus } from "@/features/studio/components/studio-autosave-status";
import { StudioSetupHeader } from "@/features/studio/components/studio-setup-header";
import type { SaveQueueStatus } from "@/hooks/use-latest-save-queue";

if (!i18n.locale) {
  i18n.loadAndActivate({ locale: "en", messages: {} });
}

type SetupState =
  | "create"
  | "saved"
  | "saving"
  | "failed"
  | "conflict"
  | "read-only";
type StoryArgs = { state: SetupState };

const roles = [
  { name: "Researcher", value: "Researcher" },
  { name: "Writer", value: "Writer" },
];

function headerMode(state: SetupState): "create" | "edit" | "read-only" {
  if (state === "create") {
    return "create";
  }
  return state === "read-only" ? "read-only" : "edit";
}

function autosaveStatus(state: SetupState): SaveQueueStatus {
  if (state === "failed") {
    return "error";
  }
  if (state === "read-only" || state === "create") {
    return "idle";
  }
  return state;
}

function SetupFixture({ state }: StoryArgs): ReactElement {
  const form = useForm<SetupBasicInfoValues>({
    defaultValues: { name: "Max", role: "Researcher" },
  });
  const editable = state !== "read-only";
  const mode = headerMode(state);
  const status = autosaveStatus(state);

  return (
    <main className="bg-surface-canvas flex min-h-screen flex-col">
      <StudioSetupHeader
        editable={editable}
        canPublish={editable}
        mode={mode}
        autosaveStatus={
          <StudioAutosaveStatus
            status={status}
            valid
            canRetry={status === "error"}
            onRetry={() => undefined}
            onDiscard={() => undefined}
            canDiscard={false}
            onConflict={() => undefined}
          />
        }
        formId="studio-setup-form"
        saveDisabled={false}
        onPublish={() => undefined}
      />
      <div className="mx-auto w-full max-w-230 px-6 pt-2">
        <form id="studio-setup-form">
          <SetupBasicInfo
            control={form.control}
            roleOptions={roles}
            disabled={!editable}
          />
        </form>
      </div>
    </main>
  );
}

const setupRoots: Record<SetupState, () => ReactElement> = {
  create: () => <SetupFixture state="create" />,
  saved: () => <SetupFixture state="saved" />,
  saving: () => <SetupFixture state="saving" />,
  failed: () => <SetupFixture state="failed" />,
  conflict: () => <SetupFixture state="conflict" />,
  "read-only": () => <SetupFixture state="read-only" />,
};

function SetupRouteFrame({ state }: StoryArgs): ReactElement {
  const rootRoute = createRootRoute({ component: setupRoots[state] });
  const studioRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/studio",
    component: () => null,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([studioRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return <RouterProvider router={router} />;
}

const meta: Meta<StoryArgs> = {
  title: "Studio/Setup",
  decorators: [
    (Story) => (
      <I18nProvider i18n={i18n}>
        <Story />
      </I18nProvider>
    ),
  ],
  parameters: {
    layout: "fullscreen",
    docs: { source: { code: "<StudioSetupEditor />" } },
  },
  args: { state: "saved" },
  render: ({ state }) => <SetupRouteFrame state={state} />,
};

export default meta;
type Story = StoryObj<StoryArgs>;

/** Legacy create route retains the explicit Save action before an agent exists. */
export const CreateExplicitSave: Story = { args: { state: "create" } };

/** Existing-agent setup confirms that the latest local snapshot is saved. */
export const EditSaved: Story = {};

/** Existing-agent setup shows progress while autosave is scheduled or active. */
export const EditSaving: Story = { args: { state: "saving" } };

/** Retryable autosave failure remains visible in the full header context. */
export const EditSaveFailed: Story = { args: { state: "failed" } };

/** Version conflicts remain visible without offering an unsafe blind retry. */
export const EditVersionConflict: Story = { args: { state: "conflict" } };

/** Viewers without edit rights see neither Save nor autosave controls. */
export const ReadOnly: Story = { args: { state: "read-only" } };
