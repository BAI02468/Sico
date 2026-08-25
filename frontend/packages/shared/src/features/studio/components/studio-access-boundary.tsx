import { useLingui } from "@lingui/react/macro";
import { type ReactNode } from "react";

import { MessageState } from "../../../components/message-state";
import { EMPTY_ILLUSTRATIONS } from "../../../constants/empty-illustration";
import { useOrganizationPermissionSuspense } from "../../rbac/hooks/use-organization-permission";

export function StudioAccessBoundary({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const { t } = useLingui();
  const { canEnterStudio } = useOrganizationPermissionSuspense();
  if (!canEnterStudio) {
    const illustration = EMPTY_ILLUSTRATIONS.people;
    return (
      <MessageState
        fill
        testId="studio-access-denied"
        illustrationUrl={illustration.url}
        illustrationWidth={illustration.width}
        illustrationHeight={illustration.height}
        heading={t({
          id: "studio.access.denied.heading",
          message: "Studio access required",
        })}
        body={t({
          id: "studio.access.denied.body",
          message:
            "You need an Organization Admin or Developer role to use Studio.",
        })}
      />
    );
  }
  return children;
}
