import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStore, Provider } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { userAtom } from "@/atoms/auth-atom";
import { EMPTY_ILLUSTRATIONS } from "@/constants/empty-illustration";
import { ScheduledTaskListView } from "@/features/scheduled-task/components/scheduled-task-list-view";
import { type ScheduledTask } from "@/features/scheduled-task/schemas/scheduled-task";

const {
  mockTaskQuery,
  mockToggleMutation,
  mockAgentsQuery,
  mockAgentQuery,
  mockSentinel,
  mockMutate,
} = vi.hoisted(() => ({
  mockTaskQuery: vi.fn(),
  mockToggleMutation: vi.fn(),
  mockAgentsQuery: vi.fn(),
  mockAgentQuery: vi.fn(),
  mockSentinel: vi.fn(),
  mockMutate: vi.fn(),
}));

vi.mock(
  "@/features/scheduled-task/hooks/use-scheduled-tasks-query",
  async () => {
    const actual = await vi.importActual<
      typeof import("@/features/scheduled-task/hooks/use-scheduled-tasks-query")
    >("@/features/scheduled-task/hooks/use-scheduled-tasks-query");
    return { ...actual, useScheduledTasksInfiniteQuery: mockTaskQuery };
  },
);

vi.mock("@/features/scheduled-task/hooks/use-scheduled-task-mutations", () => ({
  useToggleScheduledTaskMutation: mockToggleMutation,
}));

vi.mock("@/features/digital-worker/hooks/use-agents-query", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/digital-worker/hooks/use-agents-query")
  >("@/features/digital-worker/hooks/use-agents-query");
  return {
    ...actual,
    useAgentQuery: mockAgentQuery,
    useAgentsQuery: mockAgentsQuery,
  };
});

vi.mock("@/hooks/use-infinite-scroll-sentinel", () => ({
  useInfiniteScrollSentinel: mockSentinel,
}));

function task(overrides: Partial<ScheduledTask> = {}): ScheduledTask {
  return {
    agentInstanceId: 2,
    attachments: [],
    createdAt: 0,
    creatorUsername: "alex",
    cronExpression: "0 9 * * *",
    enabled: true,
    id: 1,
    lastRunAt: 0,
    message: "Run it",
    name: "Daily report",
    nextRunAt: 1,
    timezone: "UTC",
    updatedAt: 1,
    ...overrides,
  };
}

function taskQueryResult(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    data: {
      pages: [{ hasNext: false, items: [task()], total: 1 }],
    },
    error: null,
    fetchNextPage: vi.fn().mockResolvedValue(undefined),
    hasNextPage: false,
    isError: false,
    isFetchNextPageError: false,
    isFetchingNextPage: false,
    isPending: false,
    refetch: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockTaskQuery.mockReturnValue(taskQueryResult());
  mockToggleMutation.mockReturnValue({
    isPending: false,
    mutate: mockMutate,
    variables: undefined,
  });
  mockAgentsQuery.mockReturnValue({
    data: {
      pages: [
        {
          hasNext: false,
          items: [{ id: 2, name: "Report Worker", role: "Analyst" }],
          total: 1,
        },
      ],
    },
  });
  mockAgentQuery.mockReturnValue({ data: undefined });
});

describe("<ScheduledTaskListView>", () => {
  it("disables the worker roster query without an authenticated operator", () => {
    const store = createStore();
    store.set(userAtom, null);

    render(
      <Provider store={store}>
        <ScheduledTaskListView onCreate={vi.fn()} onEdit={vi.fn()} />
      </Provider>,
    );

    expect(mockAgentsQuery).toHaveBeenLastCalledWith(
      { operatorUsername: undefined, showInactive: true },
      { enabled: false },
    );
  });

  it("scopes the worker roster query to the authenticated operator", () => {
    const store = createStore();
    store.set(userAtom, { id: 7, email: "operator@sico.ai", roles: [] });

    render(
      <Provider store={store}>
        <ScheduledTaskListView onCreate={vi.fn()} onEdit={vi.fn()} />
      </Provider>,
    );

    expect(mockAgentsQuery).toHaveBeenLastCalledWith(
      { operatorUsername: "operator@sico.ai", showInactive: true },
      { enabled: true },
    );
  });

  it("does not report task presence while the list is pending", () => {
    const onHasTasksChange = vi.fn();
    mockTaskQuery.mockReturnValue(
      taskQueryResult({ data: undefined, isPending: true }),
    );

    render(
      <ScheduledTaskListView
        onCreate={vi.fn()}
        onEdit={vi.fn()}
        onHasTasksChange={onHasTasksChange}
      />,
    );

    expect(onHasTasksChange).not.toHaveBeenCalled();
  });

  it("does not report task presence while the list is failed", () => {
    const onHasTasksChange = vi.fn();
    mockTaskQuery.mockReturnValue(
      taskQueryResult({ data: undefined, isError: true }),
    );

    render(
      <ScheduledTaskListView
        onCreate={vi.fn()}
        onEdit={vi.fn()}
        onHasTasksChange={onHasTasksChange}
      />,
    );

    expect(onHasTasksChange).not.toHaveBeenCalled();
  });

  it("reports false after a settled empty list", () => {
    const onHasTasksChange = vi.fn();
    mockTaskQuery.mockReturnValue(
      taskQueryResult({
        data: { pages: [{ hasNext: false, items: [], total: 0 }] },
      }),
    );

    render(
      <ScheduledTaskListView
        onCreate={vi.fn()}
        onEdit={vi.fn()}
        onHasTasksChange={onHasTasksChange}
      />,
    );

    expect(onHasTasksChange).toHaveBeenCalledWith(false);
  });

  it("reports true after a settled populated list", () => {
    const onHasTasksChange = vi.fn();

    render(
      <ScheduledTaskListView
        onCreate={vi.fn()}
        onEdit={vi.fn()}
        onHasTasksChange={onHasTasksChange}
      />,
    );

    expect(onHasTasksChange).toHaveBeenCalledWith(true);
  });

  it("renders four card skeletons during the initial load", () => {
    mockTaskQuery.mockReturnValue(
      taskQueryResult({ data: undefined, isPending: true }),
    );

    render(<ScheduledTaskListView onCreate={vi.fn()} onEdit={vi.fn()} />);

    expect(screen.getAllByTestId("scheduled-task-card-skeleton")).toHaveLength(
      4,
    );
  });

  it("renders an empty state Create new action", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    mockTaskQuery.mockReturnValue(
      taskQueryResult({
        data: { pages: [{ hasNext: false, items: [], total: 0 }] },
      }),
    );

    render(<ScheduledTaskListView onCreate={onCreate} onEdit={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "No task yet" })).toBeVisible();
    expect(
      screen.getByText(
        "Automate recurring work - digest, standups, reviews - by scheduling your first task",
      ),
    ).toBeVisible();
    expect(screen.getByTestId("message-state-illustration")).toHaveAttribute(
      "src",
      EMPTY_ILLUSTRATIONS.skills.url,
    );
    expect(screen.getByTestId("message-state-illustration")).toHaveAttribute(
      "width",
      "186",
    );
    expect(screen.getByTestId("message-state-illustration")).toHaveAttribute(
      "height",
      "136",
    );
    const create = screen.getByRole("button", { name: "Create new" });
    expect(create).toHaveClass("bg-button-secondary-fill-rest");
    await user.click(create);

    expect(onCreate).toHaveBeenCalledOnce();
  });

  it("keeps loaded cards visible and appends two pagination skeletons", () => {
    mockTaskQuery.mockReturnValue(
      taskQueryResult({ isFetchingNextPage: true }),
    );

    render(<ScheduledTaskListView onCreate={vi.fn()} onEdit={vi.fn()} />);

    screen.getByRole("button", { name: "Edit Daily report" });
    expect(screen.getAllByTestId("scheduled-task-card-skeleton")).toHaveLength(
      2,
    );
  });

  it("shows an initial Retry action", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn().mockResolvedValue(undefined);
    mockTaskQuery.mockReturnValue(
      taskQueryResult({ data: undefined, isError: true, refetch }),
    );

    render(<ScheduledTaskListView onCreate={vi.fn()} onEdit={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(refetch).toHaveBeenCalledOnce();
  });

  it("preserves cards and offers a local retry after next-page failure", async () => {
    const user = userEvent.setup();
    const fetchNextPage = vi.fn().mockResolvedValue(undefined);
    mockTaskQuery.mockReturnValue(
      taskQueryResult({ fetchNextPage, isFetchNextPageError: true }),
    );

    render(<ScheduledTaskListView onCreate={vi.fn()} onEdit={vi.fn()} />);
    screen.getByRole("button", { name: "Edit Daily report" });
    await user.click(
      screen.getByRole("button", { name: "Retry loading more" }),
    );

    expect(fetchNextPage).toHaveBeenCalledOnce();
  });

  it("stops the sentinel after a next-page failure", () => {
    mockTaskQuery.mockReturnValue(
      taskQueryResult({ hasNextPage: true, isFetchNextPageError: true }),
    );

    render(<ScheduledTaskListView onCreate={vi.fn()} onEdit={vi.fn()} />);

    expect(mockSentinel).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ hasNextPage: false }),
      expect.anything(),
    );
  });

  it("hides next-page retry while another page request is active", () => {
    const fetchNextPage = vi.fn().mockResolvedValue(undefined);
    mockTaskQuery.mockReturnValue(
      taskQueryResult({
        fetchNextPage,
        isFetchNextPageError: true,
        isFetchingNextPage: true,
      }),
    );

    render(<ScheduledTaskListView onCreate={vi.fn()} onEdit={vi.fn()} />);

    expect(
      screen.queryByRole("button", { name: "Retry loading more" }),
    ).not.toBeInTheDocument();
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it("defers worker detail queries while the roster is pending", () => {
    mockAgentsQuery.mockReturnValue({ data: undefined, isPending: true });

    render(<ScheduledTaskListView onCreate={vi.fn()} onEdit={vi.fn()} />);

    screen.getByText("Digital Worker 2");
    expect(mockAgentQuery).not.toHaveBeenCalled();
  });

  it("uses the agent detail query when the loaded roster misses a worker", () => {
    mockAgentsQuery.mockReturnValue({
      data: { pages: [{ hasNext: false, items: [], total: 0 }] },
    });
    mockAgentQuery.mockReturnValue({
      data: { id: 2, name: "Inactive Worker" },
    });

    render(<ScheduledTaskListView onCreate={vi.fn()} onEdit={vi.fn()} />);

    screen.getByText("Inactive Worker");
    expect(mockAgentQuery).toHaveBeenCalledWith(2);
  });

  it("queries detail only for workers absent from the resolved roster", () => {
    mockTaskQuery.mockReturnValue(
      taskQueryResult({
        data: {
          pages: [
            {
              hasNext: false,
              items: [
                task(),
                task({ agentInstanceId: 3, id: 2, name: "Weekly report" }),
              ],
              total: 2,
            },
          ],
        },
      }),
    );
    mockAgentsQuery.mockReturnValue({
      data: {
        pages: [
          {
            hasNext: false,
            items: [{ id: 2, name: "Report Worker" }],
            total: 1,
          },
        ],
      },
    });

    render(<ScheduledTaskListView onCreate={vi.fn()} onEdit={vi.fn()} />);

    expect(mockAgentQuery).toHaveBeenCalledOnce();
    expect(mockAgentQuery).toHaveBeenCalledWith(3);
  });

  it("uses the loaded roster without requesting worker detail", () => {
    render(<ScheduledTaskListView onCreate={vi.fn()} onEdit={vi.fn()} />);

    screen.getByText("Report Worker, Analyst");
    expect(mockAgentQuery).not.toHaveBeenCalled();
  });

  it("wires the dialog scroll root and fill-on-complete sentinel", () => {
    render(<ScheduledTaskListView onCreate={vi.fn()} onEdit={vi.fn()} />);

    expect(mockSentinel).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        fetchNextPage: expect.any(Function),
        hasNextPage: false,
        isFetchingNextPage: false,
      }),
      expect.objectContaining({
        fillOnComplete: true,
        rootRef: expect.anything(),
      }),
    );
  });

  it("sends the full task and next enabled value to the toggle mutation", async () => {
    const user = userEvent.setup();
    render(<ScheduledTaskListView onCreate={vi.fn()} onEdit={vi.fn()} />);

    await user.click(
      screen.getByRole("switch", { name: "Disable Daily report" }),
    );

    expect(mockMutate).toHaveBeenCalledWith(
      { enabled: false, task: task() },
      expect.objectContaining({ onSettled: expect.any(Function) }),
    );
  });

  it("keeps every concurrently toggled task disabled", async () => {
    const user = userEvent.setup();
    mockTaskQuery.mockReturnValue(
      taskQueryResult({
        data: {
          pages: [
            {
              hasNext: false,
              items: [
                task(),
                task({ agentInstanceId: 3, id: 2, name: "Weekly report" }),
              ],
              total: 2,
            },
          ],
        },
      }),
    );
    mockAgentsQuery.mockReturnValue({
      data: {
        pages: [
          {
            hasNext: false,
            items: [
              { id: 2, name: "Report Worker" },
              { id: 3, name: "Weekly Worker" },
            ],
            total: 2,
          },
        ],
      },
    });
    render(<ScheduledTaskListView onCreate={vi.fn()} onEdit={vi.fn()} />);
    const first = screen.getByRole("switch", { name: "Disable Daily report" });
    const second = screen.getByRole("switch", {
      name: "Disable Weekly report",
    });

    await user.click(first);
    await user.click(second);

    expect(first).toHaveAttribute("aria-disabled", "true");
    expect(second).toHaveAttribute("aria-disabled", "true");
  });
});
