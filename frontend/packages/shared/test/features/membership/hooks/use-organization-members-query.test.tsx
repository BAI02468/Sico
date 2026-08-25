import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import axios, { type AxiosInstance } from "axios";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OrganizationMember } from "@/features/membership";
import {
  organizationMembersQueryOptions,
  useOrganizationMembersQuery,
} from "@/features/membership/hooks/use-organization-members-query";
import { membershipKeys } from "@/features/membership/query-keys";
import { fetchOrganizationMembers } from "@/features/membership/services/organization-membership";
import { ApiClientProvider } from "@/services/api-client-context";

vi.mock("@/features/membership/services/organization-membership", () => ({
  fetchOrganizationMembers: vi.fn(),
}));

function wrapper(
  apiClient: AxiosInstance,
): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider client={apiClient}>{children}</ApiClientProvider>
      </QueryClientProvider>
    );
  };
}

beforeEach(() => {
  vi.mocked(fetchOrganizationMembers).mockReset().mockResolvedValue([]);
});

describe("organizationMembersQueryOptions", () => {
  it("uses the Organization roster key and stale time", () => {
    const options = organizationMembersQueryOptions(9, axios.create());

    expect(options.queryKey).toEqual(membershipKeys.organization(9));
    expect(options.staleTime).toBe(30_000);
  });

  it("delegates the Organization ID to the Membership service", async () => {
    const apiClient = axios.create();
    const options = organizationMembersQueryOptions(9, apiClient);

    await new QueryClient().fetchQuery(options);

    expect(fetchOrganizationMembers).toHaveBeenCalledWith(apiClient, 9);
  });
});

describe("Organization members observer", () => {
  it("exposes the suspense query result", async () => {
    const members: OrganizationMember[] = [
      {
        id: 4,
        email: "admin@example.com",
        role: "org_admin",
        roleCodes: ["org_member", "org_admin"],
      },
    ];
    vi.mocked(fetchOrganizationMembers).mockResolvedValue(members);

    const { result } = renderHook(() => useOrganizationMembersQuery(9), {
      wrapper: wrapper(axios.create()),
    });

    await waitFor(() => expect(result.current.data).toEqual(members));
  });
});
