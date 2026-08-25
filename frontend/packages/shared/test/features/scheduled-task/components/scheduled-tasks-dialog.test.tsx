import { toast } from "@sico/ui";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode, useEffect, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ScheduledTasksDialog } from "@/features/scheduled-task/components/scheduled-tasks-dialog";
import { type ScheduledTask } from "@/features/scheduled-task/schemas/scheduled-task";

const { mockDeleteMutation, mockDeleteMutate, mockForm, mockList } = vi.hoisted(
  () => ({
    mockDeleteMutation: vi.fn(),
    mockDeleteMutate: vi.fn(),
    mockForm: vi.fn(),
    mockList: vi.fn(),
  }),
);

vi.mock(
  "@/features/scheduled-task/components/scheduled-task-list-view",
  () => ({
    ScheduledTaskListView: mockList,
  }),
);

vi.mock("@/features/scheduled-task/components/scheduled-task-form", () => ({
  ScheduledTaskForm: mockForm,
}));

vi.mock("@/features/scheduled-task/hooks/use-scheduled-task-mutations", () => ({
  useDeleteScheduledTaskMutation: mockDeleteMutation,
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

type FormMockProps = {
  task?: ScheduledTask;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  onSuccess: () => void;
};

let completePendingDelete: (() => void) | undefined;
let completePendingSave: (() => void) | undefined;

type DeleteCallbacks = { onError: () => void; onSuccess: () => void };

function useDeferredDeleteMutation(): {
  isPending: boolean;
  mutate: (_id: number, callbacks: DeleteCallbacks) => void;
} {
  const [isPending, setIsPending] = useState(false);
  return {
    isPending,
    mutate: (_id, callbacks) => {
      setIsPending(true);
      completePendingDelete = () => {
        setIsPending(false);
        callbacks.onSuccess();
      };
    },
  };
}

type ListMockProps = {
  onEdit: (scheduledTask: ScheduledTask) => void;
  onHasTasksChange: (hasTasks: boolean) => void;
};

function FormMock({
  task: scheduledTask,
  onCancel,
  onDirtyChange,
  onSuccess,
}: FormMockProps): ReactNode {
  return (
    <div>
      <input aria-label="Task name" defaultValue={scheduledTask?.name ?? ""} />
      <button type="button" onClick={onCancel}>
        Cancel form
      </button>
      <button type="button" onClick={() => onDirtyChange?.(true)}>
        Make dirty
      </button>
      <button type="button" onClick={() => onSuccess()}>
        Save form
      </button>
      <button
        type="button"
        onClick={() => {
          completePendingSave = () => onSuccess();
        }}
      >
        Start save
      </button>
    </div>
  );
}

async function requestDelete(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await user.click(
    screen.getByRole("button", { name: "Scheduled task actions" }),
  );
  await user.click(await screen.findByRole("menuitem", { name: "Delete" }));
}

function ListMock({ onEdit, onHasTasksChange }: ListMockProps): ReactNode {
  useEffect(() => onHasTasksChange(true), [onHasTasksChange]);
  return (
    <div>
      <button type="button" onClick={() => onEdit(task())}>
        Edit Daily report
      </button>
    </div>
  );
}

function EmptyListMock({
  onHasTasksChange,
}: Pick<ListMockProps, "onHasTasksChange">): ReactNode {
  useEffect(() => onHasTasksChange(false), [onHasTasksChange]);
  return <div>No task yet</div>;
}

function DialogHarness({
  initialOpen = true,
}: {
  initialOpen?: boolean;
}): ReactNode {
  const [open, setOpen] = useState(initialOpen);
  return <ScheduledTasksDialog open={open} onOpenChange={setOpen} />;
}

function ParentCloseHarness({
  closeRequested,
  onOpenChange,
}: {
  closeRequested: boolean;
  onOpenChange: (open: boolean) => void;
}): ReactNode {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (closeRequested) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- emulate a parent-controlled close.
      setOpen(false);
    }
  }, [closeRequested]);
  const handleOpenChange = (nextOpen: boolean): void => {
    onOpenChange(nextOpen);
    setOpen(nextOpen);
  };
  return <ScheduledTasksDialog open={open} onOpenChange={handleOpenChange} />;
}

beforeEach(() => {
  completePendingDelete = undefined;
  completePendingSave = undefined;
  vi.clearAllMocks();
  mockList.mockImplementation(ListMock);
  mockForm.mockImplementation(FormMock);
  mockDeleteMutation.mockReturnValue({
    isPending: false,
    mutate: mockDeleteMutate,
  });
});

describe("<ScheduledTasksDialog>", () => {
  it("keeps the header compact and gives the remaining height to the active view", () => {
    render(<DialogHarness />);

    const dialog = screen.getByRole("dialog", { name: "Scheduled task" });
    expect(dialog).toHaveClass("flex", "h-150", "w-150", "flex-col");
    expect(screen.getByTestId("scheduled-task-dialog-view")).toHaveClass(
      "min-h-0",
      "flex-1",
    );
    expect(screen.getByRole("button", { name: "Create new" })).toHaveClass(
      "border-transparent",
      "bg-button-subtle-fill-rest",
    );
    expect(
      screen.getByRole("button", { name: "Create new" }).querySelector("svg"),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Close scheduled tasks" }),
    ).not.toBeInTheDocument();
  });

  it("keeps Create new inside the empty state instead of duplicating it in the header", () => {
    mockList.mockImplementation(EmptyListMock);
    render(<DialogHarness />);

    expect(screen.getByText("No task yet")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Create new" }),
    ).not.toBeInTheDocument();
  });

  it("opens as a controlled management dialog", () => {
    render(<DialogHarness initialOpen={false} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("restores parent open state when an external dirty close is canceled", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <ParentCloseHarness closeRequested={false} onOpenChange={onOpenChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Create new" }));
    await user.type(screen.getByLabelText("Task name"), "Draft task");
    await user.click(screen.getByRole("button", { name: "Make dirty" }));
    rerender(<ParentCloseHarness closeRequested onOpenChange={onOpenChange} />);

    await screen.findByRole("dialog", { name: "Discard changes?" });
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByLabelText("Task name")).toHaveValue("Draft task");
  });

  it("closes after an externally requested dirty close is discarded", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <ParentCloseHarness closeRequested={false} onOpenChange={onOpenChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Create new" }));
    await user.click(screen.getByRole("button", { name: "Make dirty" }));
    rerender(<ParentCloseHarness closeRequested onOpenChange={onOpenChange} />);
    await screen.findByRole("dialog", { name: "Discard changes?" });
    await user.click(screen.getByRole("button", { name: "Discard changes" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("clears deletion confirmation when a parent closes the clean dialog", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <ScheduledTasksDialog open onOpenChange={onOpenChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Edit Daily report" }));
    await requestDelete(user);
    await screen.findByRole("dialog", { name: "Delete scheduled task?" });
    rerender(<ScheduledTasksDialog open={false} onOpenChange={onOpenChange} />);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    rerender(<ScheduledTasksDialog open onOpenChange={onOpenChange} />);

    expect(screen.getByRole("button", { name: "Create new" })).toBeVisible();
    expect(
      screen.queryByRole("dialog", { name: "Delete scheduled task?" }),
    ).not.toBeInTheDocument();
  });

  it("moves from the list to create and back without a discard prompt", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole("button", { name: "Create new" }));
    expect(
      screen.getByRole("heading", { name: "Scheduled task" }),
    ).toBeVisible();
    expect(screen.getByRole("dialog", { name: "Scheduled task" })).toHaveClass(
      "h-143",
      "w-150",
    );

    await user.click(screen.getByRole("button", { name: "Cancel form" }));
    expect(screen.getByRole("button", { name: "Create new" })).toBeVisible();
    expect(
      screen.queryByRole("dialog", { name: "Discard changes?" }),
    ).not.toBeInTheDocument();
  });

  it("shows task actions only while editing", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    expect(
      screen.queryByRole("button", { name: "Scheduled task actions" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create new" }));
    expect(
      screen.queryByRole("button", { name: "Scheduled task actions" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel form" }));
    await user.click(screen.getByRole("button", { name: "Edit Daily report" }));
    expect(
      screen.getByRole("button", { name: "Scheduled task actions" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Close scheduled tasks" }),
    ).not.toBeInTheDocument();
  });

  it("does not expose task actions while creating a dirty task", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole("button", { name: "Create new" }));
    await user.click(screen.getByRole("button", { name: "Make dirty" }));

    expect(
      screen.queryByRole("button", { name: "Scheduled task actions" }),
    ).not.toBeInTheDocument();
  });

  it("intercepts Escape while creating a dirty task", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole("button", { name: "Create new" }));
    await user.click(screen.getByRole("button", { name: "Make dirty" }));
    await user.click(screen.getByLabelText("Task name"));
    await user.keyboard("{Escape}");

    expect(
      screen.getByRole("dialog", { name: "Discard changes?" }),
    ).toBeVisible();
  });

  it("intercepts an outside pointer while creating a dirty task", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole("button", { name: "Create new" }));
    await user.click(screen.getByRole("button", { name: "Make dirty" }));
    await user.pointer({ target: document.body, keys: "[MouseLeft]" });

    expect(
      screen.getByRole("dialog", { name: "Discard changes?" }),
    ).toBeVisible();
  });

  it("intercepts Cancel while editing a dirty task", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole("button", { name: "Edit Daily report" }));
    await user.click(screen.getByRole("button", { name: "Make dirty" }));
    await user.click(screen.getByRole("button", { name: "Cancel form" }));

    expect(
      screen.getByRole("dialog", { name: "Discard changes?" }),
    ).toBeVisible();
  });

  it("opens the clicked task immediately inside the same management dialog", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole("button", { name: "Edit Daily report" }));

    expect(screen.getByLabelText("Task name")).toHaveValue("Daily report");
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("keeps dirty form data when discard is canceled", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole("button", { name: "Create new" }));
    await user.click(screen.getByRole("button", { name: "Make dirty" }));
    await user.click(screen.getByRole("button", { name: "Cancel form" }));

    expect(
      screen.getByRole("dialog", { name: "Discard changes?" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByLabelText("Task name")).toBeVisible();
    expect(
      screen.queryByRole("dialog", { name: "Discard changes?" }),
    ).not.toBeInTheDocument();
  });

  it("discards a dirty form and returns to the list when confirmed", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole("button", { name: "Create new" }));
    await user.click(screen.getByRole("button", { name: "Make dirty" }));
    await user.click(screen.getByRole("button", { name: "Cancel form" }));
    await user.click(screen.getByRole("button", { name: "Discard changes" }));

    expect(screen.getByRole("button", { name: "Create new" })).toBeVisible();
  });

  it("returns to the list after a create succeeds", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole("button", { name: "Create new" }));
    await user.click(screen.getByRole("button", { name: "Save form" }));

    expect(screen.getByRole("button", { name: "Create new" })).toBeVisible();
  });

  it("returns to the list after an update succeeds", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole("button", { name: "Edit Daily report" }));
    await user.click(screen.getByRole("button", { name: "Save form" }));

    expect(screen.getByRole("button", { name: "Create new" })).toBeVisible();
  });

  it("returns to the list when a save succeeds during discard to list", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole("button", { name: "Create new" }));
    await user.click(screen.getByRole("button", { name: "Make dirty" }));
    await user.click(screen.getByRole("button", { name: "Start save" }));
    await user.click(screen.getByRole("button", { name: "Cancel form" }));
    const save = completePendingSave;
    if (!save) {
      throw new Error("Expected a pending save callback");
    }

    act(save);

    expect(screen.getByRole("button", { name: "Create new" })).toBeVisible();
    expect(
      screen.queryByRole("dialog", { name: "Discard changes?" }),
    ).not.toBeInTheDocument();
  });

  it("ignores a stale save after discarding and reopening a create form", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole("button", { name: "Create new" }));
    await user.type(screen.getByLabelText("Task name"), "Old draft");
    await user.click(screen.getByRole("button", { name: "Make dirty" }));
    await user.click(screen.getByRole("button", { name: "Start save" }));
    const save = completePendingSave;
    if (!save) {
      throw new Error("Expected a pending save callback");
    }
    await user.click(screen.getByRole("button", { name: "Cancel form" }));
    await user.click(screen.getByRole("button", { name: "Discard changes" }));
    await user.click(screen.getByRole("button", { name: "Create new" }));
    await user.type(screen.getByLabelText("Task name"), "New draft");

    act(save);

    expect(screen.getByLabelText("Task name")).toHaveValue("New draft");
  });

  it("closes when a save succeeds during discard to close", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole("button", { name: "Create new" }));
    await user.click(screen.getByRole("button", { name: "Make dirty" }));
    await user.click(screen.getByRole("button", { name: "Start save" }));
    await user.keyboard("{Escape}");
    const save = completePendingSave;
    if (!save) {
      throw new Error("Expected a pending save callback");
    }

    act(save);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("reopens as a clean list after a dirty edit is discarded", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <ScheduledTasksDialog open onOpenChange={onOpenChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Edit Daily report" }));
    await user.click(screen.getByRole("button", { name: "Make dirty" }));
    rerender(<ScheduledTasksDialog open={false} onOpenChange={onOpenChange} />);
    await screen.findByRole("dialog", { name: "Discard changes?" });
    await user.click(screen.getByRole("button", { name: "Discard changes" }));
    rerender(<ScheduledTasksDialog open onOpenChange={onOpenChange} />);

    expect(screen.getByRole("button", { name: "Create new" })).toBeVisible();
    expect(screen.queryByLabelText("Task name")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Discard changes?" }),
    ).not.toBeInTheDocument();
  });

  it("does not offer deletion while creating a task", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole("button", { name: "Create new" }));

    expect(
      screen.queryByRole("button", { name: "Scheduled task actions" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the edit form after deletion is canceled", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole("button", { name: "Edit Daily report" }));
    await requestDelete(user);
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByLabelText("Task name")).toHaveValue("Daily report");
  });

  it("disables delete confirmation dismissal while deletion is pending", async () => {
    const user = userEvent.setup();
    mockDeleteMutation.mockReturnValue({
      isPending: true,
      mutate: mockDeleteMutate,
    });
    render(<DialogHarness />);

    await user.click(screen.getByRole("button", { name: "Edit Daily report" }));
    await requestDelete(user);

    expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Close" }),
    ).not.toBeInTheDocument();
  });

  it("restores a parent close while deletion is pending", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    mockDeleteMutation.mockImplementation(useDeferredDeleteMutation);
    const { rerender } = render(
      <ParentCloseHarness closeRequested={false} onOpenChange={onOpenChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Edit Daily report" }));
    await requestDelete(user);
    await user.click(
      screen.getByRole("button", { name: "Delete scheduled task" }),
    );
    rerender(<ParentCloseHarness closeRequested onOpenChange={onOpenChange} />);

    await waitFor(() => expect(onOpenChange).toHaveBeenLastCalledWith(true));
    expect(screen.getByLabelText("Task name")).toHaveValue("Daily report");
    expect(
      screen.getByRole("dialog", { name: "Delete scheduled task?" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    if (!completePendingDelete) {
      throw new Error("Expected a pending delete callback");
    }

    act(completePendingDelete);

    expect(screen.getByRole("button", { name: "Create new" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Scheduled task actions" }),
    ).not.toBeInTheDocument();
  });

  it("returns to the list and toasts after deletion succeeds", async () => {
    const user = userEvent.setup();
    const successToast = vi.spyOn(toast, "success");
    mockDeleteMutate.mockImplementation(
      (_id: number, callbacks: { onSuccess: () => void }) =>
        callbacks.onSuccess(),
    );
    render(<DialogHarness />);

    await user.click(screen.getByRole("button", { name: "Edit Daily report" }));
    await requestDelete(user);
    await user.click(
      screen.getByRole("button", { name: "Delete scheduled task" }),
    );

    expect(successToast).toHaveBeenCalledWith("Scheduled task deleted.");
    expect(screen.getByRole("button", { name: "Create new" })).toBeVisible();
  });

  it("keeps the edit form and toasts after deletion fails", async () => {
    const user = userEvent.setup();
    const errorToast = vi.spyOn(toast, "error");
    mockDeleteMutate.mockImplementation(
      (_id: number, callbacks: { onError: () => void }) => callbacks.onError(),
    );
    render(<DialogHarness />);

    await user.click(screen.getByRole("button", { name: "Edit Daily report" }));
    await requestDelete(user);
    await user.click(
      screen.getByRole("button", { name: "Delete scheduled task" }),
    );

    expect(errorToast).toHaveBeenCalledWith("Couldn't delete scheduled task.");
    expect(screen.getByLabelText("Task name")).toHaveValue("Daily report");
  });
});
