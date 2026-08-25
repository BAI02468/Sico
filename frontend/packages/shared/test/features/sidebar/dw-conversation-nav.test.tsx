import { render, screen } from "@testing-library/react";
import type { AxiosInstance } from "axios";
import type { ReactElement, ReactNode } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { conversationSummarySchema } from "@/features/chat/schemas/conversation";
import {
  type ConversationRunStatus,
  ConversationRunStatusSchema,
} from "@/schemas/conversation-run-status";
import { ApiClientProvider } from "@/services/api-client-context";

// Mock the router Link as a plain <a> carrying `to`/`params` as data attributes
// so tests can assert targets without a real router.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    "aria-current": ariaCurrent,
    "aria-label": ariaLabel,
    "data-active": dataActive,
  }: {
    to: string;
    params?: Record<string, string>;
    children: ReactNode;
    "aria-current"?: "page";
    "aria-label"?: string;
    "data-active"?: boolean;
  }): ReactElement => (
    <a
      href={to}
      data-to={to}
      data-params={params ? JSON.stringify(params) : undefined}
      aria-current={ariaCurrent}
      aria-label={ariaLabel}
      data-active={dataActive ? "" : undefined}
    >
      {children}
    </a>
  ),
}));

// The agent detail feeds the title row; useSuspenseQuery is mocked to skip the
// QueryClient. agentQueryOptions is a passthrough.
vi.mock("@tanstack/react-query", () => ({
  useSuspenseQuery: () => ({
    data: { id: 7, name: "Arena", role: "Tester", iconUri: "" },
  }),
}));
vi.mock("@/features/digital-worker/hooks/use-agents-query", () => ({
  agentQueryOptions: (agentId: number) => ({ queryKey: ["agents", agentId] }),
}));

const mockUseConversations = vi.fn();
vi.mock("@/features/chat/hooks/use-conversations", () => ({
  useConversations: (id: number) => mockUseConversations(id),
}));

// Title polling is a pure side effect covered by its own test; stub it here so
// this render-only unit test needs no QueryClient (the real hook calls
// useQueries/useQueryClient).
vi.mock("@/features/chat/hooks/use-pending-conversation-titles", () => ({
  usePendingConversationTitles: () => {},
}));

type ConversationFixture = {
  id: number;
  title: string;
  agentInstanceId?: number;
  conversationStatus?: ConversationRunStatus;
};

// The hook returns a flattened item list plus infinite-scroll controls; tests
// vary `items` and optionally the paging flags.
function convResult(
  items: readonly ConversationFixture[],
  overrides?: { hasNextPage?: boolean; isFetchingNextPage?: boolean },
): {
  items: readonly ConversationFixture[];
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
} {
  return {
    items,
    hasNextPage: overrides?.hasNextPage ?? false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: overrides?.isFetchingNextPage ?? false,
  };
}

const mockUseActiveNav = vi.fn();
vi.mock("@/features/sidebar/hooks/use-active-nav", () => ({
  useActiveNav: () => mockUseActiveNav(),
}));

const { DwConversationNav } =
  await import("@/features/sidebar/components/dw-conversation-nav");

const apiClient = {} as AxiosInstance;

function renderNav(readOnly = false): void {
  render(
    <ApiClientProvider client={apiClient}>
      <DwConversationNav agentInstanceId={7} readOnly={readOnly} />
    </ApiClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseActiveNav.mockReturnValue({ conversationId: null });
  mockUseConversations.mockReturnValue(convResult([]));
});

// jsdom has no IntersectionObserver; the conversation list mounts an
// infinite-scroll sentinel. A no-op stub is enough — these tests don't drive
// pagination, they just need the observer to construct without throwing.
beforeAll(() => {
  class NoopIO {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  Object.defineProperty(global, "IntersectionObserver", {
    writable: true,
    configurable: true,
    value: NoopIO,
  });
});

describe("DwConversationNav", () => {
  it("disables New session but keeps history links for an inactive worker", () => {
    mockUseConversations.mockReturnValue(
      convResult([{ id: 55, title: "Past chat", agentInstanceId: 7 }]),
    );
    renderNav(true);

    expect(screen.getByRole("button", { name: "New session" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Past chat" })).toBeInTheDocument();
  });

  it("shows an empty state when there are no conversations", () => {
    renderNav();
    expect(screen.getByText("No conversations yet")).toBeInTheDocument();
  });

  it("keeps the scroll container + sentinel mounted even when empty (so pagination arms on empty→non-empty)", () => {
    mockUseConversations.mockReturnValue(
      convResult([], { hasNextPage: false }),
    );
    renderNav();
    // The sentinel must exist unconditionally: the IntersectionObserver effect
    // runs once and early-returns on a null ref, so a sentinel that only appears
    // after the first conversation arrives would never be observed.
    expect(
      screen.getByTestId("conversation-list-sentinel"),
    ).toBeInTheDocument();
  });

  it("links the Session header row back to the Digital Workers list (L1)", () => {
    renderNav();
    expect(
      screen.getByRole("link", { name: "Back to Digital Workers" }),
    ).toHaveAttribute("data-to", "/digital-worker");
  });

  it("renders a row per conversation linking to its chat", () => {
    mockUseConversations.mockReturnValue(
      convResult([
        { id: 55, title: "First chat", agentInstanceId: 7 },
        { id: 56, title: "Second chat", agentInstanceId: 7 },
      ]),
    );
    renderNav();
    const first = screen.getByRole("link", { name: "First chat" });
    expect(first).toHaveAttribute(
      "data-to",
      "/digital-worker/$agentId/collaboration/$conversationId",
    );
    expect(first).toHaveAttribute(
      "data-params",
      JSON.stringify({ agentId: "7", conversationId: "55" }),
    );
  });

  it("falls back to 'Untitled' for an empty title", () => {
    mockUseConversations.mockReturnValue(
      convResult([{ id: 55, title: "", agentInstanceId: 7 }]),
    );
    renderNav();
    expect(screen.getByText("Untitled")).toBeInTheDocument();
  });

  it("shows an accessible spinner for a running conversation", () => {
    mockUseConversations.mockReturnValue(
      convResult([
        {
          id: 55,
          title: "First chat",
          conversationStatus: ConversationRunStatusSchema.enum.RUNNING,
        },
      ]),
    );
    renderNav();

    const status = screen.getByRole("status", {
      name: "Conversation running",
    });
    const spinner = status.children.item(0);
    expect(spinner).not.toBeNull();
    expect(spinner).toHaveAttribute("aria-hidden", "true");
    expect(spinner).toHaveClass("animate-spin", "text-foreground-secondary");
    expect(
      screen.getByRole("link", { name: "First chat" }),
    ).toBeInTheDocument();
  });

  it.each([
    ["idle", ConversationRunStatusSchema.enum.IDLE],
    ["unknown", ConversationRunStatusSchema.enum.UNKNOWN],
    ["missing", undefined],
  ])("shows no spinner for a %s conversation status", (_name, status) => {
    mockUseConversations.mockReturnValue(
      convResult([
        {
          id: 55,
          title: "First chat",
          conversationStatus: status,
        },
      ]),
    );
    renderNav();

    expect(
      screen.queryByRole("status", { name: "Conversation running" }),
    ).not.toBeInTheDocument();
  });

  it("shows no spinner after the schema normalizes a forward status", () => {
    const conversation = conversationSummarySchema.parse({
      id: 55,
      title: "First chat",
      conversationStatus: 999,
    });
    mockUseConversations.mockReturnValue(convResult([conversation]));
    renderNav();

    expect(
      screen.queryByRole("status", { name: "Conversation running" }),
    ).not.toBeInTheDocument();
  });

  it("marks the active conversation row with data-active", () => {
    mockUseActiveNav.mockReturnValue({ conversationId: "56" });
    mockUseConversations.mockReturnValue(
      convResult([
        { id: 55, title: "First chat", agentInstanceId: 7 },
        { id: 56, title: "Second chat", agentInstanceId: 7 },
      ]),
    );
    renderNav();
    expect(screen.getByRole("link", { name: "Second chat" })).toHaveAttribute(
      "data-active",
    );
    expect(
      screen.getByRole("link", { name: "First chat" }),
    ).not.toHaveAttribute("data-active");
  });

  it("shows a loading skeleton row at the bottom while fetching the next page", () => {
    mockUseConversations.mockReturnValue(
      convResult([{ id: 55, title: "First chat", agentInstanceId: 7 }], {
        hasNextPage: true,
        isFetchingNextPage: true,
      }),
    );
    renderNav();
    expect(screen.getByTestId("conversation-loading-more")).toBeInTheDocument();
  });

  it("shows no loading skeleton when not fetching", () => {
    mockUseConversations.mockReturnValue(
      convResult([{ id: 55, title: "First chat", agentInstanceId: 7 }], {
        hasNextPage: true,
        isFetchingNextPage: false,
      }),
    );
    renderNav();
    expect(
      screen.queryByTestId("conversation-loading-more"),
    ).not.toBeInTheDocument();
  });
});
