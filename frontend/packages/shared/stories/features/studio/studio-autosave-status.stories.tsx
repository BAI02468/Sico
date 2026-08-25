import type { Meta, StoryObj } from "@storybook/react-vite";

import { StudioAutosaveStatus } from "@/features/studio/components/studio-autosave-status";

const meta = {
  title: "Studio/AutosaveStatus",
  component: StudioAutosaveStatus,
  parameters: { layout: "centered" },
  args: {
    status: "saved",
    valid: true,
    canRetry: true,
    onRetry: () => undefined,
    onDiscard: () => undefined,
    canDiscard: false,
    onConflict: () => undefined,
  },
} satisfies Meta<typeof StudioAutosaveStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Confirmed persistence state after the latest draft is acknowledged. */
export const Saved: Story = {};

/** Debounced or active persistence state with a progress indicator. */
export const Saving: Story = { args: { status: "saving" } };

/** Retryable network or server failure with a persistent action. */
export const Failed: Story = { args: { status: "error" } };

/** Failed create that can only be discarded because replay is unsafe. */
export const DiscardOnlyFailure: Story = {
  args: { status: "error", canRetry: false, canDiscard: true },
};

/** Version conflict requiring the editor to review newer server content. */
export const Conflict: Story = { args: { status: "conflict" } };

/** Invalid required fields remain local and block persistence. */
export const Invalid: Story = { args: { status: "idle", valid: false } };
