import { useLingui } from "@lingui/react/macro";
import type * as React from "react";

import { MessageState } from "../../../components/message-state";
import { EMPTY_ILLUSTRATIONS } from "../../../constants/empty-illustration";

export function OrganizationUnavailable(): React.JSX.Element {
  const { t } = useLingui();
  return (
    <MessageState
      fill
      illustrationUrl={EMPTY_ILLUSTRATIONS.people.url}
      illustrationWidth={EMPTY_ILLUSTRATIONS.people.width}
      illustrationHeight={EMPTY_ILLUSTRATIONS.people.height}
      heading={t({
        id: "organization.empty.title",
        message: "No organization available",
      })}
    />
  );
}
