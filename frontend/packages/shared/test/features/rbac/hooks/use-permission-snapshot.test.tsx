import {
  QueryClient,
  QueryClientProvider,
  useQueryErrorResetBoundary,
} from "@tanstack/react-query";
import { act, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { createStore, Provider } from "jotai";
import { type ReactElement, type ReactNode, Suspense } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { userAtom } from "@/atoms/auth-atom";
import {
  usePermissionSnapshotQuery,
  usePermissionSnapshotSuspenseQuery,
} from "@/features/rbac/hooks/use-permission-snapshot";
import { rbacKeys } from "@/features/rbac/query-keys";
import * as roleService from "@/features/rbac/services/user-role";
import { ApiClientProvider } from "@/services/api-client-context";

vi.mock("@/features/rbac/services/user-role");

function QueryErrorFallback({
  error,
  resetErrorBoundary,
}: FallbackProps): ReactElement {
  return (
    <div role="alert">
      <span>{error instanceof Error ? error.message : "failed"}</span>
      <button type="button" onClick={resetErrorBoundary}>
        Try again
      </button>
    </div>
  );
}

function QueryBoundary({ children }: { children: ReactNode }): ReactElement {
  const { reset } = useQueryErrorResetBoundary();
  return (
    <ErrorBoundary onReset={reset} FallbackComponent={QueryErrorFallback}>
      <Suspense fallback={null}>{children}</Suspense>
    </ErrorBoundary>
  );
}

function makeWrapper(userId: number | null): {
  Wrapper: (props: { children: ReactNode }) => ReactElement;
  queryClient: QueryClient;
} {
  const store = createStore();
  if (userId !== null) {
    store.set(userAtom, {
      id: userId,
      email: `user-${String(userId)}@example.com`,
      roles: [],
    });
  }

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <ApiClientProvider client={axios.create()}>
            <QueryBoundary>{children}</QueryBoundary>
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

describe("permission snapshot hooks", () => {
  it("normalizes grants under the user-scoped RBAC key", async () => {
    vi.mocked(roleService.fetchUserRoles).mockResolvedValue([
      {
        userId: 7,
        roleCode: "org_admin",
        scopeType: "org",
        scopeId: 9,
      },
    ]);
    const { Wrapper, queryClient } = makeWrapper(7);
    const { result } = renderHook(() => usePermissionSnapshotQuery(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(
      result.current.data?.organizationRoles.get(9)?.has("org_admin"),
    ).toBe(true);
    expect(queryClient.getQueryData(rbacKeys.userRoles(7))).toHaveLength(1);
  });

  it("shares one raw-role request across permission observers", async () => {
    const { Wrapper } = makeWrapper(7);
    const { result } = renderHook(
      () => ({
        first: usePermissionSnapshotQuery(),
        second: usePermissionSnapshotQuery(),
      }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.first.isSuccess).toBe(true));
    expect(result.current.second.isSuccess).toBe(true);
    expect(roleService.fetchUserRoles).toHaveBeenCalledTimes(1);
  });

  it("does not request roles without an authenticated user", async () => {
    const { Wrapper } = makeWrapper(null);
    const { result } = renderHook(() => usePermissionSnapshotQuery(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(roleService.fetchUserRoles).not.toHaveBeenCalled();
    expect(result.current.data?.organizationRoles.size).toBe(0);
  });

  it("shares cached raw roles with the suspense observer", () => {
    const { Wrapper, queryClient } = makeWrapper(7);
    queryClient.setQueryData(rbacKeys.userRoles(7), [
      {
        userId: 7,
        roleCode: "developer",
        scopeType: "org",
        scopeId: 9,
      },
    ]);

    const { result } = renderHook(() => usePermissionSnapshotSuspenseQuery(), {
      wrapper: Wrapper,
    });

    expect(result.current.data.organizationRoles.get(9)?.has("developer")).toBe(
      true,
    );
  });

  it("stays fail-closed while retrying a stale roles error", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const roles = [
      {
        userId: 7,
        roleCode: "developer",
        scopeType: "org",
        scopeId: 9,
      },
    ] satisfies Awaited<ReturnType<typeof roleService.fetchUserRoles>>;
    let resolveRetry: (nextRoles: typeof roles) => void = () => {};
    const retry = new Promise<typeof roles>((resolve) => {
      resolveRetry = resolve;
    });
    vi.mocked(roleService.fetchUserRoles)
      .mockRejectedValueOnce(new Error("roles failed"))
      .mockReturnValueOnce(retry);
    const { Wrapper, queryClient } = makeWrapper(7);
    queryClient.setQueryData(rbacKeys.userRoles(7), roles, { updatedAt: 0 });
    const user = userEvent.setup();
    const { result } = renderHook(() => usePermissionSnapshotSuspenseQuery(), {
      wrapper: Wrapper,
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("roles failed");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() =>
      expect(result.current.data.organizationRoles.size).toBe(0),
    );

    await act(async () => {
      resolveRetry(roles);
      await retry;
    });
    await waitFor(() =>
      expect(
        result.current.data.organizationRoles.get(9)?.has("developer"),
      ).toBe(true),
    );
    expect(roleService.fetchUserRoles).toHaveBeenCalledTimes(2);
    consoleError.mockRestore();
  });
});
