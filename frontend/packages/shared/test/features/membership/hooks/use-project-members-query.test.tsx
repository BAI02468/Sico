import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import axios, { type AxiosInstance } from "axios";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  projectMembersQueryOptions,
  useProjectMembersQuery,
  useProjectMembersSuspenseQuery,
} from "@/features/membership/hooks/use-project-members-query";
import { membershipKeys } from "@/features/membership/query-keys";
import { fetchProjectMembers } from "@/features/membership/services/project-membership";
import { ApiClientProvider } from "@/services/api-client-context";

vi.mock("@/features/membership/services/project-membership", () => ({
  fetchProjectMembers: vi.fn(),
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
  vi.mocked(fetchProjectMembers).mockReset().mockResolvedValue([]);
});

describe("projectMembersQueryOptions", () => {
  it("uses the Project roster key and stale time", () => {
    const options = projectMembersQueryOptions(7, axios.create());

    expect(options.queryKey).toEqual(membershipKeys.project(7));
    expect(options.staleTime).toBe(30_000);
  });

  it("delegates the Project ID to the Membership service", async () => {
    const apiClient = axios.create();
    const options = projectMembersQueryOptions(7, apiClient);

    await new QueryClient().fetchQuery(options);

    expect(fetchProjectMembers).toHaveBeenCalledWith(apiClient, 7);
  });
});

describe("Project members observers", () => {
  it("exposes the ordinary query result", async () => {
    const members = [
      {
        id: 3,
        email: "member@example.com",
        roleCode: "project_member" as const,
      },
    ];
    vi.mocked(fetchProjectMembers).mockResolvedValue(members);

    const { result } = renderHook(() => useProjectMembersQuery(7), {
      wrapper: wrapper(axios.create()),
    });

    await waitFor(() => expect(result.current.data).toEqual(members));
  });

  it("exposes the suspense query result", async () => {
    const members = [
      { id: 3, email: "admin@example.com", roleCode: "project_admin" as const },
    ];
    vi.mocked(fetchProjectMembers).mockResolvedValue(members);

    const { result } = renderHook(() => useProjectMembersSuspenseQuery(7), {
      wrapper: wrapper(axios.create()),
    });

    await waitFor(() => expect(result.current.data).toEqual(members));
  });
});
