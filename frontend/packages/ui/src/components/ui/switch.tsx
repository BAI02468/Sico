import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import type * as React from "react";

import { cn } from "../../lib/utils";

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default";
}): React.JSX.Element {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      // eslint-disable-next-line tailwindcss/no-custom-classname -- `h-switch-default-height` resolves from the Tailwind v4 `--spacing-switch-default-height` token, which the plugin cannot resolve.
      className={cn(
        "peer group/switch focus-visible:border-focus-rest focus-visible:ring-focus-rest/50 aria-invalid:border-input-stroke-error aria-invalid:ring-focus-error/20 data-[size=default]:h-switch-default-height data-checked:bg-switch-track-fill-selected data-unchecked:bg-switch-track-fill-rest relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-3 aria-invalid:ring-3 data-disabled:cursor-not-allowed data-disabled:opacity-50 data-[size=default]:w-8 data-[size=sm]:h-3.5 data-[size=sm]:w-6",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        data-testid="switch-thumb"
        // eslint-disable-next-line tailwindcss/no-custom-classname -- `bg-switch-thumb-fill` resolves from the Tailwind v4 `--color-switch-thumb-fill` token, which the plugin cannot resolve.
        className="bg-switch-thumb-fill pointer-events-none block rounded-full ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:data-checked:translate-x-3.5 group-data-[size=sm]/switch:data-checked:translate-x-2.5 group-data-[size=default]/switch:data-unchecked:translate-x-0 group-data-[size=sm]/switch:data-unchecked:translate-x-0"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
