/// <reference types="@testing-library/jest-dom" />
/* eslint-disable react/jsx-props-no-spreading -- test spreads a shared `baseProps` fixture over the component-under-test to vary one prop per case; the no-spread rule targets app code, not test ergonomics. */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NotificationList } from "@/features/notifications/components/notification-list";
import type { Notification } from "@/features/notifications/schemas/notification";

// NotificationCard reaches useNavigate; stub it so the list renders in isolation.
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));

// ErrorView logs caught errors via the shared logger; silence it so the
// error-state test doesn't spew a stack trace into the test output.
vi.mock("@/utils/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// A DELIVERABLE_SHARED (type 7) row — a surviving notification type with simple,
// stable copy ("Shared … to …") for the list-state assertions.
function note(overrides: Partial<Notification>): Notification {
  return {
    id: 1,
    content: "",
    senderUsername: "Bob",
    createdAt: 1_750_000_000_000,
    updatedAt: 1_750_000_000_000,
    status: 2,
    type: 7,
    extraInfo: {
      deliverable: { fileName: "report.pdf", projectName: "Acme" },
    },
    ...overrides,
  } as Notification;
}

const baseProps = {
  isPending: false,
  isError: false,
  error: undefined,
  refetch: vi.fn(),
  visible: [] as Notification[],
  filter: "all" as const,
  markRead: vi.fn(),
  onCardClose: vi.fn(),
};

describe("<NotificationList> states", () => {
  it("first load (isPending): renders skeleton rows, no error/empty", () => {
    render(<NotificationList {...baseProps} isPending />);
    expect(screen.getByLabelText("Loading notifications")).toBeInTheDocument();
    expect(
      document.querySelectorAll("[data-slot=skeleton]").length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("first-load error (isError + no data): renders ErrorView with a Try again button", () => {
    render(
      <NotificationList
        {...baseProps}
        isError
        error={new Error("network down")}
        visible={[]}
      />,
    );
    // ErrorView renders role=alert + a "Try again" action.
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it("background-poll error (isError BUT data present): keeps the list, no error screen", () => {
    render(
      <NotificationList
        {...baseProps}
        isError
        error={new Error("poll failed")}
        visible={[note({ id: 1 })]}
      />,
    );
    // A failed poll must NOT replace a populated list with the error screen.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Shared report.pdf to Acme.")).toBeInTheDocument();
  });

  it("empty on All tab: 'No notifications yet'", () => {
    render(<NotificationList {...baseProps} filter="all" visible={[]} />);
    expect(screen.getByText("You're all caught up")).toBeInTheDocument();
    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
  });

  it("empty on Unread tab: 'No unread notifications'", () => {
    render(<NotificationList {...baseProps} filter="unread" visible={[]} />);
    expect(screen.getByText("No unread notifications")).toBeInTheDocument();
  });

  it("list: renders a card per visible notification", () => {
    render(
      <NotificationList
        {...baseProps}
        visible={[note({ id: 1 }), note({ id: 2 })]}
      />,
    );
    expect(screen.getAllByText("Shared report.pdf to Acme.")).toHaveLength(2);
  });

  it("isPending wins over isError (first load can't be both states visibly)", () => {
    render(<NotificationList {...baseProps} isPending isError />);
    expect(screen.getByLabelText("Loading notifications")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
