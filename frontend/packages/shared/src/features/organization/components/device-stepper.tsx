import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@sico/ui";
import { Minus, Monitor, Plus, Smartphone } from "lucide-react";
import type * as React from "react";

import { type DeviceCategory } from "../../devices";

export type DeviceStepperProps = {
  category: DeviceCategory;
  value: number;
  minimum: number;
  maximum: number;
  available: number;
  disabled: boolean;
  onChange: (value: number) => void;
};

export function DeviceStepper({
  category,
  value,
  minimum,
  maximum,
  available,
  disabled,
  onChange,
}: DeviceStepperProps): React.JSX.Element {
  const { t } = useLingui();
  const mobile = category === "mobile";
  return (
    <div className="flex h-10 items-center gap-3">
      <span className="bg-surface-icon-tile text-foreground-secondary flex size-10 items-center justify-center rounded-lg">
        {mobile ? (
          <Smartphone aria-hidden="true" />
        ) : (
          <Monitor aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-foreground-primary block text-base font-medium uppercase">
          {mobile
            ? t({ id: "organization.devices.mobile", message: "Mobiles" })
            : t({ id: "organization.devices.windows", message: "Windows" })}
        </span>
        <span className="text-foreground-tertiary block text-sm">
          {t({
            id: "organization.devices.available",
            message: plural(available, {
              one: "# available",
              other: "# available",
            }),
          })}
        </span>
      </span>
      <Trans id="organization.devices.inUseCount">
        <div className="border-divider flex h-8.5 items-center rounded-lg border">
          <Button
            type="button"
            variant="subtle"
            size="icon-xs"
            aria-label={t({
              id: "organization.devices.decrease",
              message: "Decrease",
            })}
            disabled={disabled || value <= minimum}
            onClick={() => onChange(value - 1)}
          >
            <Minus aria-hidden="true" />
          </Button>
          <span className="text-foreground-primary min-w-8 text-center text-base font-medium">
            {value}
          </span>
          <Button
            type="button"
            variant="subtle"
            size="icon-xs"
            aria-label={t({
              id: "organization.devices.increase",
              message: "Increase",
            })}
            disabled={disabled || value >= maximum}
            onClick={() => onChange(value + 1)}
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>{" "}
        <span className="text-foreground-tertiary w-12 text-sm">in use</span>
      </Trans>
    </div>
  );
}
