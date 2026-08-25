import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { AvatarGroup } from "@sico/ui";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type * as React from "react";

import { DwAvatar } from "../../../components/dw-avatar/dw-avatar";
import { UserAvatar } from "../../../components/user-avatar/user-avatar";
import { type ProjectDetail } from "../schemas/project";

const MAX_PREVIEW_AVATARS = 3;

/**
 * Mixed human + digital-worker avatar preview + roster count for the team
 * drawer section. Humans (the full member roster) come first, then DWs, capped
 * at MAX_PREVIEW_AVATARS. `total` counts the whole roster (members +
 * owner-if-missing + DWs). Uses `projectMembers` — the complete roster (admins
 * included) — NOT `operatorAdmins`, which is only the admin usernames and
 * undercounts non-admin members.
 *
 * A component (not a render helper) so its own `useLingui()` hook `t` runs as a
 * macro: the `${{ count }}` interpolation is only extractable/localizable
 * through the macro `t`, not a threaded `translate` param.
 */
export function TeamPreview({
  project,
}: {
  project: ProjectDetail;
}): React.JSX.Element {
  const { t } = useLingui();
  // `projectMembers` already includes admins; add the owner only if the roster
  // omits them (owner isn't guaranteed to be in the members list).
  const humans = [...project.projectMembers];
  if (!humans.some((m) => m.username === project.ownerUsername)) {
    humans.push({
      id: -1,
      username: project.ownerUsername,
      email: project.ownerUsername,
    });
  }
  const total = humans.length + project.agentInstances.length;
  const avatars: React.ReactNode[] = [];
  for (const member of humans) {
    if (avatars.length >= MAX_PREVIEW_AVATARS) {
      break;
    }
    avatars.push(
      <UserAvatar
        key={`u:${member.username}`}
        user={{
          name: member.alias ?? member.username,
          email: member.email,
          iconUri: member.iconUrl,
        }}
        decorative
        size="xs"
      />,
    );
  }
  for (const agent of project.agentInstances) {
    if (avatars.length >= MAX_PREVIEW_AVATARS) {
      break;
    }
    avatars.push(
      <DwAvatar
        key={`a:${agent.id}`}
        agent={{ iconUri: agent.iconUrl }}
        decorative
        size="xs"
      />,
    );
  }
  return (
    <Link
      to="/project/$projectId/team/operators"
      params={{ projectId: String(project.id) }}
      className="text-foreground-secondary hover:text-foreground-primary flex h-7 items-center gap-2 self-start rounded-md text-sm font-normal transition-colors outline-none focus-visible:ring-2"
    >
      <AvatarGroup>{avatars}</AvatarGroup>
      <span className="flex items-center gap-1">
        {t({
          id: "projects.drawerTeam.workerCount",
          message: plural(total, { one: "# worker", other: "# workers" }),
        })}
        <ChevronRight className="size-4" />
      </span>
    </Link>
  );
}
