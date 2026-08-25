import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { ConfirmDialog } from "@/components/confirm-dialog";

type StoryArgs = { pending: boolean };

if (!i18n.locale) {
  i18n.loadAndActivate({ locale: "en", messages: {} });
}

const meta: Meta<StoryArgs> = {
  title: "Studio/Delete",
  decorators: [
    (Story) => (
      <I18nProvider i18n={i18n}>
        <Story />
      </I18nProvider>
    ),
  ],
  parameters: {
    layout: "centered",
    docs: { source: { code: "<StudioDeleteAgentDialog />" } },
  },
  args: { pending: false },
  render: ({ pending }) => (
    <ConfirmDialog
      open
      title="Delete digital worker"
      body="Delete “Max”? This cannot be undone."
      pending={pending}
      confirmLabel="Delete"
      pendingLabel="Deleting…"
      onOpenChange={() => undefined}
      onConfirm={() => undefined}
    />
  ),
};

export default meta;
type Story = StoryObj<StoryArgs>;

/** Deletion asks for explicit confirmation before removing the digital worker. */
export const Confirmation: Story = {};

/** Pending deletion prevents dismissal and duplicate destructive requests. */
export const Pending: Story = { args: { pending: true } };
