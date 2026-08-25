import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { PublishAccessDialog } from "@/features/studio/components/publish-access-dialog";
import { StudioSetupHeaderActions } from "@/features/studio/components/studio-setup-header-actions";

type StoryArgs = {
  canManageEditors: boolean;
  canDelete: boolean;
  pending: boolean;
};

if (!i18n.locale) {
  i18n.loadAndActivate({ locale: "en", messages: {} });
}

const meta: Meta<StoryArgs> = {
  title: "Studio/Actions",
  decorators: [
    (Story) => (
      <I18nProvider i18n={i18n}>
        <Story />
      </I18nProvider>
    ),
  ],
  parameters: {
    layout: "centered",
    docs: { source: { code: "<StudioSetupHeaderActions />" } },
  },
  args: { canManageEditors: true, canDelete: true, pending: false },
  render: ({ canManageEditors, canDelete, pending }) => (
    <div className="flex items-center gap-4">
      <StudioSetupHeaderActions
        canManageEditors={canManageEditors}
        canDelete={canDelete}
      />
      <PublishAccessDialog
        open
        pending={pending}
        onOpenChange={() => undefined}
        onPublish={() => undefined}
      />
    </div>
  ),
};

export default meta;
type Story = StoryObj<StoryArgs>;

/** Owner actions expose editor management and destructive deletion. */
export const Owner: Story = {};

/** Editor actions retain the same menu with owner-only choices unavailable. */
export const Editor: Story = {
  args: { canManageEditors: false, canDelete: false },
};

/** Publish access remains locked while the selected visibility is publishing. */
export const PublishPending: Story = { args: { pending: true } };
