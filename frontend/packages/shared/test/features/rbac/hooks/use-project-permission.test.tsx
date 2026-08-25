import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import axios from "axios";
import { createStore, Provider } from "jotai";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { userAtom } from "@/atoms/auth-atom";
import { useProjectPermission } from "@/features/rbac/hooks/use-project-permission";
import { useProjectPermissionSuspense } from "@/features/rbac/hooks/use-project-permission-suspense";
import { rbacKeys } from "@/features/rbac/query-keys";
import * as roleService from "@/features/rbac/services/user-role";
import { ApiClientProvider } from "@/services/api-client-context";

vi.mock("@/features/rbac/services/user-role");

function makeWrapper(): {
  Wrapper: (props: { children: ReactNode }) => ReactElement;
  queryClient: QueryClient;
} {
  const store = createStore();
  store.set(userAtom, { id: 7, email: "user@example.com", roles: [] });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <ApiClientProvider client={axios.create()}>
            {children}
          </ApiClientProvider>
        </QueryClientProvider>
      </Provider>
    );
  }

  return { Wrapper, queryClient };
}

beforeEach(() => {
  vi.mocked(roleService.fetchUserRoles).mockReset().mockResolvedValue([]);
});

describe("project permission hooks", () => {
  it("derives admin capabilities and preserves the public result shape", async () => {
    vi.mocked(roleService.fetchUserRoles).mockResolvedValue([
      {
        userId: 7,
        roleCode: "project_admin",
        scopeType: "project",
        scopeId: 5,
      },
    ]);
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useProjectPermission(5), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toMatchObject({
      canManageProject: true,
      canManageDw: true,
      canInviteDw: true,
      canManageAsset: true,
      canManageAssetOwn: true,
      canUseDw: true,
      userEmail: "user@example.com",
      isError: false,
    });
  });

  it("fails closed when the role query fails", async () => {
    vi.mocked(roleService.fetchUserRoles).mockRejectedValue(
      new Error("failed"),
    );
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useProjectPermission(5), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.canManageProject).toBe(false);
    expect(result.current.canUseDw).toBe(false);
  });

  it("fails closed when a retained grant refetch fails", async () => {
    vi.mocked(roleService.fetchUserRoles).mockRejectedValue(
      new Error("failed"),
    );
    const { Wrapper, queryClient } = makeWrapper();
    queryClient.setQueryData(rbacKeys.userRoles(7), [
      {
        userId: 7,
        roleCode: "project_admin",
        scopeType: "project",
        scopeId: 5,
      },
    ]);
    const { result } = renderHook(() => useProjectPermission(5), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.canManageProject).toBe(false);
  });

  it("uses the same cached grants in the suspense hook", () => {
    const { Wrapper, queryClient } = makeWrapper();
    queryClient.setQueryData(rbacKeys.userRoles(7), [
      {
        userId: 7,
        roleCode: "project_member",
        scopeType: "project",
        scopeId: 5,
      },
    ]);

    const { result } = renderHook(() => useProjectPermissionSuspense(5), {
      wrapper: Wrapper,
    });

    expect(result.current).toMatchObject({
      canManageProject: false,
      canInviteDw: true,
      canUseDw: true,
      userEmail: "user@example.com",
    });
  });
});
