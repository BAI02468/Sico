/// <reference types="@testing-library/jest-dom" />
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the api client the hook reads via useApiClient.
const put = vi.fn().mockResolvedValue({ data: {} });
const get = vi.fn();
vi.mock("@/services/api-client-context", () => ({
  useApiClient: () => ({ get, put }),
}));

const { useNotifications } =
  await import("@/features/notifications/hooks/use-notifications");

function makeWrapper(): ({ children }: { children: ReactNode }) => ReactNode {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactNode {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const TWO_ROWS = {
  code: 0,
  data: {
    total: 2,
    hasMore: false,
    notifications: [
      { id: 1, status: 2, createdAt: 2, updatedAt: 2 }, // UNREAD
      { id: 2, status: 2, createdAt: 1, updatedAt: 1 }, // UNREAD
    ],
  },
};

beforeEach(() => {
  put.mockClear();
  get.mockReset().mockResolvedValue({ data: TWO_ROWS });
});

describe("useNotifications — scheduled task ingestion", () => {
  it("keeps type 15 and its completion payload", async () => {
    get.mockResolvedValue({
      data: {
        code: 0,
        data: {
          total: 1,
          hasMore: false,
          notifications: [
            {
              id: 15,
              type: 15,
              status: 2,
              content: "Daily report",
              extraInfo: {
                scheduledTaskFinished: {
                  task: { id: 7, title: "Daily report" },
                  status: 3,
                  scheduledTaskRunId: 8,
                  conversationId: 91,
                  agentInstance: {
                    id: 24,
                    agentName: "Reporter",
                    agentIconUrl: "default_space/reporter.png",
                    operatorUsername: "owner@microsoft.com",
                  },
                  scheduledFor: 1_787_000_000_000,
                },
              },
              createdAt: 1_787_000_100_000,
              updatedAt: 1_787_000_100_000,
            },
          ],
        },
      },
    });
    const { result } = renderHook(() => useNotifications(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.notifications).toHaveLength(1));
    expect(result.current.notifications[0]).toMatchObject({
      type: 15,
      extraInfo: {
        scheduledTaskFinished: {
          task: { id: 7, title: "Daily report" },
          status: 3,
          conversationId: 91,
          agentInstance: {
            id: 24,
            agentName: "Reporter",
            agentIconUrl: "default_space/reporter.png",
            operatorUsername: "owner@microsoft.com",
          },
        },
      },
    });
  });
});

describe("useNotifications — markAllRead", () => {
  it("PUTs /notification/read-all and optimistically flips every unread row to READ", async () => {
    const { result } = renderHook(() => useNotifications(), {
      wrapper: makeWrapper(),
    });

    // Wait for the initial fetch to populate the two unread rows.
    await waitFor(() => expect(result.current.unreadCount).toBe(2));

    await act(async () => {
      result.current.markAllRead();
    });

    // Hits the read-all endpoint (no body needed — the server reads the caller).
    expect(put).toHaveBeenCalledWith("/notification/read-all");
    // Optimistic cache patch: unread count drops to 0 without waiting for a poll.
    await waitFor(() => expect(result.current.unreadCount).toBe(0));
  });
});
