import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { membershipKeys } from "@/features/membership";
import { projectKeys } from "@/features/projects/query-keys";
import { rbacKeys } from "@/features/rbac/query-keys";
import { invalidateProjectMemberAccess } from "@/features/team/utils/invalidate-project-member-access";

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

describe("invalidateProjectMemberAccess", () => {
  it("invalidates another user's access without clearing current-user access", async () => {
    const queryClient = new QueryClient();
    const currentUserRoles = [{ roleCode: "organization_admin" }];
    queryClient.setQueryData(rbacKeys.userRoles(3), currentUserRoles);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await invalidateProjectMemberAccess(queryClient, {
      projectId: 7,
      targetUserId: 5,
      currentUserId: 3,
    });

    expect(invalidate).toHaveBeenCalledTimes(3);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: membershipKeys.project(7),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: projectKeys.detail(7),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: rbacKeys.userRoles(5),
      exact: true,
    });
    expect(queryClient.getQueryData(rbacKeys.userRoles(3))).toEqual(
      currentUserRoles,
    );
    expect(invalidate).not.toHaveBeenCalledWith({
      queryKey: projectKeys.lists(),
      exact: false,
    });
  });

  it("synchronously clears self access and invalidates project lists", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(rbacKeys.userRoles(3), [
      { roleCode: "project_admin" },
    ]);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    const invalidation = invalidateProjectMemberAccess(queryClient, {
      projectId: 7,
      targetUserId: 3,
      currentUserId: 3,
    });

    expect(queryClient.getQueryData(rbacKeys.userRoles(3))).toEqual([]);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: projectKeys.lists(),
      exact: false,
    });
    await invalidation;
  });

  it("resolves only after every cache invalidation resolves", async () => {
    const queryClient = new QueryClient();
    const pendingInvalidations: ReturnType<typeof deferred>[] = [];
    vi.spyOn(queryClient, "invalidateQueries").mockImplementation(() => {
      const pending = deferred();
      pendingInvalidations.push(pending);
      return pending.promise;
    });
    const settled = vi.fn();

    const invalidation = invalidateProjectMemberAccess(queryClient, {
      projectId: 7,
      targetUserId: 3,
      currentUserId: 3,
    }).then(settled);

    expect(pendingInvalidations).toHaveLength(4);
    for (const pending of pendingInvalidations.slice(0, -1)) {
      pending.resolve();
    }
    await Promise.all(
      pendingInvalidations.slice(0, -1).map(({ promise }) => promise),
    );
    expect(settled).not.toHaveBeenCalled();

    pendingInvalidations.at(-1)?.resolve();
    await invalidation;
    expect(settled).toHaveBeenCalledOnce();
  });
});
