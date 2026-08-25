import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type JSX } from "react";
import { useForm } from "react-hook-form";

import { type LoadState } from "@/features/digital-worker/utils/load-state";
import { type SetupBasicInfoValues } from "@/features/skill/components/setup/setup-basic-info-values";
import { CreateStudioAgentDialogView } from "@/features/studio/components/create-studio-agent-dialog-view";

type StoryArgs = {
  rolesState: LoadState;
  organizationState: LoadState;
  pending: boolean;
};

if (!i18n.locale) {
  i18n.loadAndActivate({ locale: "en", messages: {} });
}

const roles = [
  { name: "Product Manager", value: "Product Manager" },
  { name: "Researcher", value: "Researcher" },
];

function DialogStory({
  rolesState,
  organizationState,
  pending,
}: StoryArgs): JSX.Element {
  const form = useForm<SetupBasicInfoValues>({
    defaultValues: { name: "", role: "" },
  });
  return (
    <CreateStudioAgentDialogView
      open
      pending={pending}
      canSubmit={rolesState === "ready" && organizationState === "ready"}
      control={form.control}
      roles={rolesState === "ready" ? roles : []}
      rolesState={rolesState}
      organizationState={organizationState}
      onOpenChange={() => undefined}
      onRetryRoles={() => undefined}
      onRetryOrganization={() => undefined}
      onSubmit={(event) => event.preventDefault()}
    />
  );
}

const meta: Meta<StoryArgs> = {
  title: "Studio/CreateAgentDialog",
  decorators: [
    (Story) => (
      <I18nProvider i18n={i18n}>
        <Story />
      </I18nProvider>
    ),
  ],
  parameters: {
    layout: "centered",
    docs: {
      source: {
        code: `function Example() {
  const [open, setOpen] = useState(true);
  return (
    <CreateStudioAgentDialog open={open} onOpenChange={setOpen} />
  );
}`,
      },
    },
  },
  args: {
    rolesState: "ready",
    organizationState: "ready",
    pending: false,
  },
  render: ({ rolesState, organizationState, pending }) => (
    <DialogStory
      rolesState={rolesState}
      organizationState={organizationState}
      pending={pending}
    />
  ),
};

export default meta;
type Story = StoryObj<StoryArgs>;

/** Ready state exposes both required fields and the primary continuation action. */
export const Ready: Story = {};

/** Loading state explains that role and organization dependencies are resolving. */
export const Loading: Story = {
  args: { rolesState: "loading", organizationState: "loading" },
};

/** Load failure keeps creation unavailable and provides retry actions. */
export const LoadError: Story = {
  args: { rolesState: "error", organizationState: "error" },
};

/** Empty roles make the unavailable selection state explicit. */
export const NoRoles: Story = { args: { rolesState: "empty" } };

/** Missing organization explains why the current account cannot create a worker. */
export const NoOrganization: Story = {
  args: { organizationState: "empty" },
};

/** Pending creation locks dismissal and prevents duplicate submission. */
export const SubmitPending: Story = { args: { pending: true } };
