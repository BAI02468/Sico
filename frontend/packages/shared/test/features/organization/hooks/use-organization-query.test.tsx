import {
  QueryClient,
  QueryClientProvider,
  useQueryErrorResetBoundary,
} from "@tanstack/react-query";
import { act, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios, { type AxiosInstance } from "axios";
import { createStore, Provider } from "jotai";
import { type ReactElement, type ReactNode, Suspense } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { userAtom } from "@/atoms/auth-atom";
import {
  boundOrganizationQueryOptions,
  userOrganizationsQueryOptions,
  useUserOrganizationsQuery,
} from "@/features/organization/hooks/use-organization-query";
import { organizationKeys } from "@/features/organization/query-keys";
import * as organizationService from "@/features/organization/services/organization";
import {
  useBoundOrganizationQuery,
  useBoundOrganizationSuspenseQuery,
} from "@/hooks/use-bound-organization";
import { ApiClientProvider } from "@/services/api-client-context";

vi.mock("@/features/organization/services/organization");

const organization = {
  id: 9,
  name: "SICO",
  description: "",
  createdAt: 1,
  updatedAt: 1,
  creatorUsername: "owner@example.com",
  roleCodes: ["org_member" as const],
  isOwner: false,
};

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

function makeWrapper(queryClient: QueryClient): {
  Wrapper: (props: { children: ReactNode }) => ReactElement;
  apiClient: AxiosInstance;
} {
  const store = createStore();
  store.set(userAtom, { id: 7, email: "user@example.com", roles: [] });
  const apiClient = axios.create();

  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <ApiClientProvider client={apiClient}>
            <QueryBoundary>{children}</QueryBoundary>
          </ApiClientProvider>
        </QueryClientProvider>
      </Provider>
    );
  }

  return { Wrapper, apiClient };
}

beforeEach(() => {
  vi.mocked(organizationService.fetchUserOrganizations).mockReset();
});

describe("organization summary queries", () => {
  it("shares one cache entry between bound and list observers", async () => {
    vi.mocked(organizationService.fetchUserOrganizations).mockResolvedValue([
      organization,
    ]);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { Wrapper, apiClient } = makeWrapper(queryClient);
    await queryClient.prefetchQuery(
      boundOrganizationQueryOptions(apiClient, 7),
    );

    const { result } = renderHook(
      () => ({
        bound: useBoundOrganizationQuery(),
        suspenseBound: useBoundOrganizationSuspenseQuery(),
        list: useUserOrganizationsQuery(),
      }),
      { wrapper: Wrapper },
    );

    expect(result.current.bound.data).toEqual(organization);
    expect(result.current.suspenseBound.data).toEqual(organization);
    expect(result.current.list.data).toEqual([organization]);
    expect(organizationService.fetchUserOrganizations).toHaveBeenCalledOnce();
    expect(
      queryClient.getQueryData(organizationKeys.userOrganizations(7)),
    ).toEqual([organization]);
  });

  it("returns null when the authenticated user has no bound organization", async () => {
    vi.mocked(organizationService.fetchUserOrganizations).mockResolvedValue([]);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { Wrapper, apiClient } = makeWrapper(queryClient);
    await queryClient.prefetchQuery(
      boundOrganizationQueryOptions(apiClient, 7),
    );

    const { result } = renderHook(() => useBoundOrganizationSuspenseQuery(), {
      wrapper: Wrapper,
    });

    expect(result.current.data).toBeNull();
  });

  it("stays fail-closed while retrying a stale refetch error", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    let resolveRetry: (
      organizations: (typeof organization)[],
    ) => void = () => {};
    const retry = new Promise<(typeof organization)[]>((resolve) => {
      resolveRetry = resolve;
    });
    vi.mocked(organizationService.fetchUserOrganizations)
      .mockRejectedValueOnce(new Error("organization failed"))
      .mockReturnValueOnce(retry);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(
      organizationKeys.userOrganizations(7),
      [organization],
      { updatedAt: 0 },
    );
    const { Wrapper } = makeWrapper(queryClient);
    const user = userEvent.setup();
    const { result } = renderHook(() => useBoundOrganizationSuspenseQuery(), {
      wrapper: Wrapper,
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "organization failed",
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(result.current.data).toBeNull());

    await act(async () => {
      resolveRetry([organization]);
      await retry;
    });
    await waitFor(() => expect(result.current.data).toEqual(organization));
    expect(organizationService.fetchUserOrganizations).toHaveBeenCalledTimes(2);
    consoleError.mockRestore();
  });

  it("uses a separate key for each authenticated user", () => {
    expect(organizationKeys.userOrganizations(7)).not.toEqual(
      organizationKeys.userOrganizations(8),
    );
  });

  it("does not request summaries without an authenticated user", async () => {
    const queryClient = new QueryClient();
    const apiClient = axios.create();

    await queryClient.fetchQuery(
      userOrganizationsQueryOptions(apiClient, null),
    );

    expect(organizationService.fetchUserOrganizations).not.toHaveBeenCalled();
  });
});
