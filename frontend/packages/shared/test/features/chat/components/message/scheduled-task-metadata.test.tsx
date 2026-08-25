import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ScheduledTaskMetadata } from "@/features/chat/components/message/scheduled-task-metadata";

const NOW = new Date("2024-06-15T12:00:00");
const TODAY_0930 = new Date("2024-06-15T09:30:00").getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ScheduledTaskMetadata", () => {
  it("renders the localized full label with a same-day time", () => {
    render(<ScheduledTaskMetadata createdAt={TODAY_0930} />);

    expect(screen.getByText("09:30").parentElement).toHaveTextContent(
      "Scheduled task · 09:30",
    );
  });

  it("uses the chat formatter for a yesterday time", () => {
    const yesterday = new Date("2024-06-14T23:15:00").getTime();
    render(<ScheduledTaskMetadata createdAt={yesterday} />);

    expect(screen.getByText("Yesterday 23:15").parentElement).toHaveTextContent(
      "Scheduled task · Yesterday 23:15",
    );
  });

  it("uses the chat formatter for an earlier historical time", () => {
    const historical = new Date("2023-12-31T08:05:00").getTime();
    render(<ScheduledTaskMetadata createdAt={historical} />);

    expect(
      screen.getByText("2023-12-31 08:05").parentElement,
    ).toHaveTextContent("Scheduled task · 2023-12-31 08:05");
  });

  it("renders a semantic time with its ISO dateTime", () => {
    render(<ScheduledTaskMetadata createdAt={TODAY_0930} />);

    const time = screen.getByText("09:30");
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute(
      "dateTime",
      new Date(TODAY_0930).toISOString(),
    );
  });

  it("uses right-aligned tertiary timestamp typography", () => {
    render(<ScheduledTaskMetadata createdAt={TODAY_0930} />);

    expect(screen.getByText("09:30").parentElement).toHaveClass(
      "text-right",
      "text-foreground-tertiary",
      "leading-body",
      "text-xs",
      "tracking-wide",
      "whitespace-nowrap",
    );
  });

  it("does not render an interactive control", () => {
    render(<ScheduledTaskMetadata createdAt={TODAY_0930} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("does not render an icon", () => {
    const { container } = render(
      <ScheduledTaskMetadata createdAt={TODAY_0930} />,
    );

    expect(container.getElementsByTagName("svg")).toHaveLength(0);
  });
});
