import type { Meta, StoryObj } from "@storybook/react-vite";

import { Switch } from "../src/components/ui/switch";

const meta = {
  title: "Components/Switch",
  component: Switch,
  parameters: { layout: "centered" },
  args: {
    "aria-label": "Enable notifications",
    defaultChecked: false,
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default appearance — an unchecked, default-sized switch. */
export const Default: Story = {};

/** Checked appearance — the track uses the component-owned selected fill token. */
export const Checked: Story = {
  args: { defaultChecked: true },
};

/** Compact appearance — uses the small 24 × 14px track and 12px thumb. */
export const Small: Story = {
  args: { size: "sm" },
};

/** Disabled appearance — prevents interaction and reduces track opacity. */
export const Disabled: Story = {
  args: { disabled: true },
};

/** Invalid appearance — uses semantic input-error and focus-error tokens. */
export const Invalid: Story = {
  args: { "aria-invalid": true },
};
