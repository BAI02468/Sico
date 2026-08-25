import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ScheduledTaskCard } from "@/features/scheduled-task/components/scheduled-task-card";
import { type ScheduledTask } from "@/features/scheduled-task/schemas/scheduled-task";

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

const workerIconUri =
  "https://dwp-cdn-ddcqh0dkgnhbchgs.b01.azurefd.net/test/default_space/7661735044905435136.png";

describe("<ScheduledTaskCard>", () => {
  it("renders the task, formatted schedule, and Digital Worker name", () => {
    const { container } = render(
      <ScheduledTaskCard
        task={task()}
        workerName="Report Worker"
        workerIconUri={workerIconUri}
        onEdit={vi.fn()}
        onToggle={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Edit Daily report" }),
    ).toHaveClass(
      "hover:border-stroke-subtle-card-hover",
      "hover:shadow-m",
      "active:border-stroke-subtle-card-pressed",
      "focus-visible:ring-focus-rest/50",
    );
    expect(
      screen.getByRole("button", { name: "Edit Daily report" }),
    ).toHaveTextContent("Daily report");
    screen.getByText("Every day · 9:00 AM");
    screen.getByText("Report Worker");
    expect(container.querySelector("img")).toBeInTheDocument();
  });

  it("renders unsupported cron as Custom schedule", () => {
    render(
      <ScheduledTaskCard
        task={task({ cronExpression: "0/1 * * * *" })}
        workerName="Report Worker"
        onEdit={vi.fn()}
        onToggle={vi.fn()}
      />,
    );

    screen.getByText("Custom schedule");
  });

  it("opens edit from the full-card button", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <ScheduledTaskCard
        task={task()}
        workerName="Report Worker"
        onEdit={onEdit}
        onToggle={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit Daily report" }));

    expect(onEdit).toHaveBeenCalledWith(task());
  });

  it("toggles without opening edit", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onToggle = vi.fn();
    render(
      <ScheduledTaskCard
        task={task()}
        workerName="Report Worker"
        onEdit={onEdit}
        onToggle={onToggle}
      />,
    );

    await user.click(
      screen.getByRole("switch", { name: "Disable Daily report" }),
    );

    expect(onToggle).toHaveBeenCalledWith(task(), false);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("disables the switch while its toggle is pending", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <ScheduledTaskCard
        task={task()}
        workerName="Report Worker"
        togglePending
        onEdit={vi.fn()}
        onToggle={onToggle}
      />,
    );
    const toggle = screen.getByRole("switch", {
      name: "Disable Daily report",
    });

    expect(toggle).toHaveAttribute("aria-disabled", "true");
    expect(toggle).toHaveAttribute("tabindex", "-1");
    await user.click(toggle);
    expect(onToggle).not.toHaveBeenCalled();
  });
});
