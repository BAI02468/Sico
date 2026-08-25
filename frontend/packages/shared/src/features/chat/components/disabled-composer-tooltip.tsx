import { Trans, useLingui } from "@lingui/react/macro";
import { Tooltip, TooltipContent, TooltipTrigger } from "@sico/ui";
import { type JSX, type ReactElement } from "react";

type Props = {
  readonly disabled: boolean;
  readonly children: ReactElement;
};

export function DisabledComposerTooltip({
  disabled,
  children,
}: Props): JSX.Element {
  const { t } = useLingui();
  if (!disabled) {
    return children;
  }

  return (
    <Tooltip delayDuration={0}>
      <div className="relative w-full">
        {children}
        <TooltipTrigger
          render={
            <div
              role="button"
              className="focus-visible:outline-focus-rest absolute inset-0 z-10 cursor-not-allowed rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2"
              tabIndex={0}
              aria-disabled="true"
            />
          }
          aria-label={t({
            id: "chat.composer.inactiveAriaLabel",
            message: "Inactive Digital Worker",
          })}
        />
      </div>
      <TooltipContent className="text-wrap">
        <Trans id="chat.composer.inactiveTooltip">
          This Digital Worker is inactive and cannot receive new tasks.
        </Trans>
      </TooltipContent>
    </Tooltip>
  );
}
