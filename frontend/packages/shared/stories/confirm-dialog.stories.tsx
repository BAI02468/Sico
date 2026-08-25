import type { Meta, StoryObj } from "@storybook/react-vite";

import { ConfirmDialog } from "@/components/confirm-dialog";

const meta = {
  title: "Components/ConfirmDialog",
  component: ConfirmDialog,
  parameters: { layout: "centered" },
  args: {
    open: true,
    title: "Delete knowledge?",
    body: "Permanently remove access to this knowledge across your project.",
    pending: false,
    onOpenChange: () => {},
    onConfirm: () => {},
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default destructive confirmation with the shared 600px content width. */
export const Default: Story = {};

/** Pending confirmation keeps the destructive action disabled with a spinner. */
export const Pending: Story = {
  args: { pending: true },
};
