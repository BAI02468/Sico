import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  type AnyRouter,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders, type AxiosInstance } from "axios";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

import { DigitalWorkers } from "@/features/digital-worker/components/digital-workers";
import type { ScheduledTasksDialogProps } from "@/features/scheduled-task";
import { ApiClientProvider } from "@/services/api-client-context";

function axiosErrorWithStatus(status: number): AxiosError {
  const headers = new AxiosHeaders();
  return new AxiosError(
    `HTTP ${String(status)}`,
    String(status),
    { headers },
    undefined,
    {
      status,
      statusText: "",
      headers: new AxiosHeaders(),
      config: { headers },
      data: null,
    },
  );
}

function axiosErrorNoResponse(): AxiosError {
  return new AxiosError("Network Error", "ERR_NETWORK");
}

// The suspense hook either returns data, throws a Promise (pending), or
// throws an Error (rejected). Tests configure the mock to do exactly
// one of those three.
const { mockScheduledTasksDialog, mockSuspense } = vi.hoisted(() => ({
  mockScheduledTasksDialog: vi.fn(),
  mockSuspense: vi.fn(),
}));

vi.mock("@/features/scheduled-task", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/scheduled-task")>();
  const ActualScheduledTasksDialog = actual.ScheduledTasksDialog;
  return {
    ...actual,
    ScheduledTasksDialog: ({
      onOpenChange,
      open,
    }: ScheduledTasksDialogProps) => {
      mockScheduledTasksDialog({ onOpenChange, open });
      return (
        <ActualScheduledTasksDialog open={open} onOpenChange={onOpenChange} />
      );
    },
  };
});

vi.mock("@/features/digital-worker/hooks/use-agents-query", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/digital-worker/hooks/use-agents-query")
  >("@/features/digital-worker/hooks/use-agents-query");
  return {
    ...actual,
    useSuspenseAgentsInfiniteQuery: (params?: { showInactive?: boolean }) =>
      mockSuspense(params),
  };
});

function returnPages(pages: { items: unknown[]; hasNext: boolean }[]): void {
  mockSuspense.mockImplementation(() => ({
    data: { pages: pages.map((p) => ({ ...p, total: p.items.length })) },
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
  }));
}

// Distinct page sets per filter — mirrors the server, which returns only active
// DWs when `showInactive` is false and all DWs when true. Lets a test assert the
// toggle drives a re-query rather than a client-side filter.
function returnPagesByFilter(byFilter: {
  hide: { items: unknown[]; hasNext: boolean }[];
  show: { items: unknown[]; hasNext: boolean }[];
}): void {
  mockSuspense.mockImplementation((params?: { showInactive?: boolean }) => {
    const pages = params?.showInactive ? byFilter.show : byFilter.hide;
    return {
      data: { pages: pages.map((p) => ({ ...p, total: p.items.length })) },
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
    };
  });
}

function throwError(error: unknown): void {
  mockSuspense.mockImplementation(() => {
    throw error;
  });
}

function throwPending(): void {
  // Suspense unwraps a thrown Promise to render the fallback.
  mockSuspense.mockImplementation(() => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- Suspense unwraps thrown Promises to render the fallback.
    throw new Promise(() => {});
  });
}

function renderPage(): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <DigitalWorkers />,
  });
  const collabRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/digital-worker/$agentId/collaboration",
    component: () => <div>collab</div>,
  });
  const router: AnyRouter = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, collabRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });

  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    // Stub client: the empty-state branch reads projects via a non-suspense
    // query; return an empty page so it resolves to "no project".
    const apiClient = {
      get: vi.fn().mockResolvedValue({
        data: {
          code: 0,
          msg: "",
          data: { projects: [], total: 0, hasNext: false },
        },
      }),
    } as unknown as AxiosInstance;
    return (
      <QueryClientProvider client={client}>
        <ApiClientProvider client={apiClient}>{children}</ApiClientProvider>
      </QueryClientProvider>
    );
  }

  render(
    <Wrapper>
      <RouterProvider router={router} />
    </Wrapper>,
  );
}

beforeEach(() => {
  mockScheduledTasksDialog.mockClear();
  mockSuspense.mockReset();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  );
});

describe("<DigitalWorkers>", () => {
  it("keeps scheduled task management mounted while controlled closed", async () => {
    returnPages([{ items: [], hasNext: false }]);
    renderPage();

    await screen.findByRole("heading", { name: "Digital Workers" });
    expect(mockScheduledTasksDialog).toHaveBeenCalledWith(
      expect.objectContaining({ open: false }),
    );
  });

  it("opens and closes scheduled task management without affecting add worker", async () => {
    const user = userEvent.setup();
    returnPages([{ items: [], hasNext: false }]);
    renderPage();
    const heading = await screen.findByRole("heading", {
      name: "Digital Workers",
    });
    const titleGroup = heading.parentElement;
    expect(titleGroup).not.toHaveClass("blur-xs");

    const scheduledTask = screen.getByRole("button", {
      name: "Scheduled task",
    });
    const actions = screen.getByRole("button", {
      name: "Digital Worker actions",
    });
    expect(scheduledTask).toHaveClass("bg-button-subtle-fill-rest");
    expect(scheduledTask).toAppearBefore(actions);
    expect(
      screen.queryByRole("button", { name: "Add Digital Worker" }),
    ).not.toBeInTheDocument();

    await user.click(scheduledTask);
    await screen.findByRole("dialog", { name: "Scheduled task" });
    expect(titleGroup).toHaveClass("blur-xs");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(titleGroup).not.toHaveClass("blur-xs");

    await user.click(actions);
    await user.click(
      await screen.findByRole("menuitem", { name: "Digital Worker" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Add Digital Worker",
    });
    expect(dialog).toBeVisible();
    expect(titleGroup).toHaveClass("blur-xs");

    const description = screen.getByText(
      "You'll be the Human Operator for this Digital Worker.",
    );
    expect(description).toHaveClass("text-sm");
    expect(description.closest('[data-slot="dialog-header"]')).toHaveClass(
      "gap-1",
    );
  });

  it("renders 12 skeletons while suspending", async () => {
    throwPending();
    renderPage();
    expect(
      await screen.findAllByTestId("digital-worker-card-skeleton"),
    ).toHaveLength(12);
  });

  it("renders cards in backend order (no client re-sort)", async () => {
    // `selectDedupedAgents` preserves backend order — it does NOT re-sort by
    // `updatedAt` (a higher updatedAt on a later page must not jump ahead).
    returnPages([
      {
        items: [
          { id: 1, name: "First", updatedAt: 1704067200000 },
          { id: 2, name: "Second", updatedAt: 1735689600000 },
        ],
        hasNext: false,
      },
    ]);
    renderPage();
    const links = await screen.findAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]?.textContent).toContain("First");
  });

  it("shows the onboarding CTA and the inactive toggle when the list is empty", async () => {
    // Empty in either filter → the onboarding empty state (Add-DW CTA) renders
    // inline, so a brand-new user reaches it, while the reveal toggle stays
    // mounted below for a user whose only workers are inactive.
    returnPages([{ items: [], hasNext: false }]);
    renderPage();
    await screen.findByText("Your crew is one hire away");
    expect(
      screen.getByRole("button", { name: /show inactive digital workers/i }),
    ).toBeInTheDocument();
  });

  it("hides inactive workers by default and supports a show-hide round trip", async () => {
    const user = userEvent.setup();
    // Server-side filter: hide returns only active; show returns all. The
    // toggle flips `showInactive`, which re-queries — not a client-side filter.
    returnPagesByFilter({
      hide: [
        { items: [{ id: 1, name: "ActiveOne", status: 3 }], hasNext: false },
      ],
      show: [
        {
          items: [
            { id: 1, name: "ActiveOne", status: 3 },
            { id: 2, name: "GoneOne", status: 4 },
          ],
          hasNext: false,
        },
      ],
    });
    renderPage();
    await screen.findByText("ActiveOne");
    expect(screen.queryByText("GoneOne")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /show inactive digital workers/i }),
    );
    expect(await screen.findByText("GoneOne")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: /hide inactive digital workers/i }),
    );
    await waitFor(() =>
      expect(screen.queryByText("GoneOne")).not.toBeInTheDocument(),
    );
  });

  it("renders network copy for AxiosError without response", async () => {
    throwError(axiosErrorNoResponse());
    renderPage();
    await screen.findByText("Check your connection and try again.");
  });

  it("renders network copy for raw AbortError (non-Axios)", async () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    throwError(err);
    renderPage();
    await screen.findByText("Check your connection and try again.");
  });

  it("renders network copy for raw TypeError (fetch Failed to fetch)", async () => {
    throwError(new TypeError("Failed to fetch"));
    renderPage();
    await screen.findByText("Check your connection and try again.");
  });

  it("renders server copy for AxiosError 5xx (500)", async () => {
    throwError(axiosErrorWithStatus(500));
    renderPage();
    await screen.findByText(
      "Something went wrong on our end. Try again in a moment.",
    );
  });

  it("renders server copy for AxiosError 502", async () => {
    throwError(axiosErrorWithStatus(502));
    renderPage();
    await screen.findByText(
      "Something went wrong on our end. Try again in a moment.",
    );
  });

  it("renders unknown-bucket title for AxiosError 4xx (contract bug)", async () => {
    throwError(axiosErrorWithStatus(404));
    renderPage();
    await screen.findByText("Something went wrong on this page. Try again.");
  });

  it("renders schema-bucket title for ZodError (schema mismatch)", async () => {
    const zodErr = new ZodError([
      {
        code: "invalid_type",
        expected: "string",
        path: ["name"],
        message: "Expected string",
        input: 123,
      },
    ]);
    throwError(zodErr);
    renderPage();
    await screen.findByText(
      "We received unexpected data. Try refreshing the page.",
    );
  });

  it("renders unknown-bucket title for plain Error (envelope missing)", async () => {
    throwError(new Error("Envelope missing"));
    renderPage();
    await screen.findByText("Something went wrong on this page. Try again.");
  });
});
