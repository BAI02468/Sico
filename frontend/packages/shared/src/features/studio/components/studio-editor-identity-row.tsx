import { UserAvatar } from "../../../components/user-avatar";
import type { RbacUser } from "../../rbac/schemas/user-role";

export function StudioEditorIdentityRow({
  email,
  role,
  user,
  action,
}: {
  email: string;
  role: string;
  user?: RbacUser;
  action?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex h-6 items-center justify-between">
      <div className="flex min-w-0 items-center gap-2">
        <UserAvatar
          user={{
            name: user?.alias ?? user?.username ?? email,
            email,
            iconUri: user?.iconUri,
          }}
          size="xs"
          decorative
        />
        <span className="text-foreground-secondary truncate text-sm font-medium">
          {email}
        </span>
      </div>
      <div className="text-foreground-secondary flex items-center gap-2 text-xs tracking-wide">
        <span>{role}</span>
        <span className="flex size-7 items-center justify-center">
          {action}
        </span>
      </div>
    </div>
  );
}
