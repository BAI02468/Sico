import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@sico/ui";
import { Link, useLocation } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { type ReactNode } from "react";
import type * as React from "react";

import { NAV_ROW_STATE } from "../../sidebar/constants";
import { useOrganizationBack } from "../hooks/use-organization-back";

export function OrganizationManagementShell({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const { t } = useLingui();
  const { pathname } = useLocation();
  const onBack = useOrganizationBack();
  const membersActive = pathname.startsWith("/organization/members");
  const projectsActive = pathname.startsWith("/organization/projects");
  const navClass = `${NAV_ROW_STATE} flex h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium`;
  const activeNavClass = "bg-surface-muted text-foreground-emphasis";

  return (
    <div className="bg-surface-canvas flex h-full min-h-0">
      <div className="bg-surface-basic flex w-84 shrink-0 flex-col">
        <header className="flex h-12 shrink-0 items-center px-2">
          <Button
            variant="subtle"
            size="icon-xs"
            aria-label={t({
              id: "organization.navigation.back",
              message: "Back",
            })}
            onClick={onBack}
          >
            <ArrowLeft aria-hidden="true" className="rtl:rotate-180" />
          </Button>
          <span className="text-foreground-secondary ms-1 text-base">
            <Trans id="organization.navigation.title">
              Manage Organization
            </Trans>
          </span>
        </header>
        <aside className="min-h-0 flex-1 p-2">
          <nav
            aria-label={t({
              id: "organization.navigation.ariaLabel",
              message: "Organization management",
            })}
            className="flex flex-col gap-1"
          >
            <Link
              to="/organization/members"
              replace
              aria-current={membersActive ? "page" : undefined}
              className={`${navClass} ${membersActive ? activeNavClass : ""}`}
            >
              <Trans id="organization.navigation.organization">
                Organization
              </Trans>
            </Link>
            <Link
              to="/organization/projects"
              replace
              aria-current={projectsActive ? "page" : undefined}
              className={`${navClass} ${projectsActive ? activeNavClass : ""}`}
            >
              <Trans id="organization.navigation.projects">Projects</Trans>
            </Link>
          </nav>
        </aside>
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
