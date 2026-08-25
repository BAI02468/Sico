/// <reference types="@testing-library/jest-dom" />
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationCard } from "@/features/notifications/components/notification-card";
import {
  type Notification,
  notificationSchema,
} from "@/features/notifications/schemas/notification";

// One shared navigate spy so each test can assert the route a card jumps to.
const navigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
}));

// UserAvatar reaches no network; render it for real so we can assert the
// `<img>` vs initials fallback (the type-2 avatar regression). Base UI's
// AvatarImage only mounts the <img> after the image fires `load`; in jsdom we
// stub window.Image so `complete=true` triggers its fast-path to 'loaded'.
class StubImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 1;
  complete = true;
  set src(_: string) {
    // No-op: `complete=true` triggers Base UI's fast-path to 'loaded'.
  }
}

function makeNotification(overrides: Partial<Notification>): Notification {
  return {
    id: 1,
    content: "",
    senderUsername: "",
    receiverUsername: "",
    createdAt: 1_750_000_000_000,
    updatedAt: 1_750_000_000_000,
    status: 2, // UNREAD
    type: undefined,
    extraInfo: undefined,
    ...overrides,
  } as Notification;
}

beforeEach(() => {
  navigate.mockReset();
  // @ts-expect-error -- jsdom stub for Base UI AvatarImage fast-path
  window.Image = StubImage;
});

describe("<NotificationCard> type → behaviour", () => {
  it("type 7 (deliverable shared): 'Shared {file} to {project}.', whole-card → file preview", async () => {
    const onRead = vi.fn();
    const onClose = vi.fn();
    render(
      <NotificationCard
        notification={makeNotification({
          id: 99,
          type: 7,
          status: 2, // UNREAD
          senderUsername: "Alina",
          projectId: 84, // top-level on the wire, NOT in extraInfo
          extraInfo: {
            deliverable: {
              deliverableId: 7,
              fileName: "report.md",
              projectName: "SICO",
            },
          },
        })}
        onRead={onRead}
        onClose={onClose}
      />,
    );
    expect(screen.getByText("Shared report.md to SICO.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Shared report.md to SICO."));
    // Whole-card click behaves like every other card: close popover, clear the
    // unread dot (mark read), then open the shared file's full-page preview.
    expect(onClose).toHaveBeenCalledOnce();
    expect(onRead).toHaveBeenCalledWith(99);
    expect(navigate).toHaveBeenCalledWith({
      to: "/project/$projectId/deliverable/$assetId",
      params: { projectId: "84", assetId: "7" },
      state: { fromNotification: true },
    });
  });

  it("marks an unread card read on click (whole-card)", async () => {
    const onRead = vi.fn();
    render(
      <NotificationCard
        notification={makeNotification({
          id: 42,
          type: 8,
          status: 2, // UNREAD
          projectId: 84,
          extraInfo: { dwAction: { agentInstanceName: "FinanceBot" } },
        })}
        onRead={onRead}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onRead).toHaveBeenCalledWith(42);
  });

  it("type 8 (DW dismissed): clickable → project Team / Digital workers tab", () => {
    const onClose = vi.fn();
    render(
      <NotificationCard
        notification={makeNotification({
          type: 8,
          projectId: 84,
          extraInfo: { dwAction: { agentInstanceName: "FinanceBot" } },
        })}
        onRead={vi.fn()}
        onClose={onClose}
      />,
    );
    expect(
      screen.getByText("Your Digital Worker FinanceBot has been dismissed."),
    ).toBeInTheDocument();
    // DW rows use the DwAvatar (DW glyph / avatar), not a person avatar or icon.
    expect(
      document.querySelector("[data-testid='avatar-root']"),
    ).toBeInTheDocument();
    // The DW is gone, so the row opens the project's DW roster (Team tab).
    fireEvent.click(screen.getByRole("button"));
    expect(onClose).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith({
      to: "/project/$projectId/team/digital-workers",
      params: { projectId: "84" },
    });
  });

  it("type 8 (DW dismissed): renders the DW avatar from agentInstanceIconUrl", () => {
    render(
      <NotificationCard
        notification={makeNotification({
          type: 8,
          projectId: 84,
          extraInfo: {
            dwAction: {
              agentInstanceName: "FinanceBot",
              agentInstanceIconUrl: "https://cdn.example.com/max.png",
            },
          },
        })}
        onRead={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      document.querySelector("[data-testid='avatar-image']"),
    ).toHaveAttribute("src", "https://cdn.example.com/max.png");
  });

  it("type 8 (DW dismissed): not clickable when projectId is 0 (no valid project)", () => {
    render(
      <NotificationCard
        notification={makeNotification({
          type: 8,
          projectId: 0,
          extraInfo: { dwAction: { agentInstanceName: "FinanceBot" } },
        })}
        onRead={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("type 9 (DW reassigned) to the new operator: 'assigned to you', clickable → project Team / DW tab", () => {
    const onClose = vi.fn();
    render(
      <NotificationCard
        notification={makeNotification({
          type: 9,
          projectId: 84,
          receiverUsername: "newop@ms.com",
          extraInfo: {
            dwAction: {
              agentInstanceId: 321,
              agentInstanceName: "Aria",
              oldOperatorUsername: "oldop@ms.com",
              newOperatorUsername: "newop@ms.com",
            },
          },
        })}
        onRead={vi.fn()}
        onClose={onClose}
      />,
    );
    expect(
      screen.getByText("Aria has been assigned to you by Admin."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(onClose).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith({
      to: "/project/$projectId/team/digital-workers",
      params: { projectId: "84" },
    });
  });

  it("type 9 (DW reassigned) to the previous operator: 'assigned to another operator', → project Team / DW tab", () => {
    const onClose = vi.fn();
    render(
      <NotificationCard
        notification={makeNotification({
          type: 9,
          projectId: 84,
          receiverUsername: "oldop@ms.com",
          extraInfo: {
            dwAction: {
              agentInstanceId: 321,
              agentInstanceName: "Aria",
              oldOperatorUsername: "oldop@ms.com",
              newOperatorUsername: "newop@ms.com",
            },
          },
        })}
        onRead={vi.fn()}
        onClose={onClose}
      />,
    );
    expect(
      screen.getByText("Aria has been assigned to another operator by Admin."),
    ).toBeInTheDocument();
    // Both operators land on the same project Team / DW tab (per spec).
    fireEvent.click(screen.getByRole("button"));
    expect(onClose).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith({
      to: "/project/$projectId/team/digital-workers",
      params: { projectId: "84" },
    });
  });

  it("type 10 (member invitation): clickable → the project", () => {
    const onClose = vi.fn();
    render(
      <NotificationCard
        notification={makeNotification({
          type: 10,
          extraInfo: { roleChange: { project: { id: 127, name: "Demo" } } },
        })}
        onRead={vi.fn()}
        onClose={onClose}
      />,
    );
    expect(
      screen.getByText("You have been invited to join Demo."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(onClose).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith({
      to: "/project/$projectId",
      params: { projectId: "127" },
    });
  });

  it("type 10 (member invitation): shows the sender's initials via UserAvatar", () => {
    render(
      <NotificationCard
        notification={makeNotification({
          type: 10,
          senderUsername: "freda@microsoft.com",
          extraInfo: { roleChange: { project: { id: 127, name: "Demo" } } },
        })}
        onRead={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    // No iconUri in the payload → UserAvatar renders the sender's initials.
    expect(
      document.querySelector("[data-testid='avatar-fallback']"),
    ).toHaveTextContent("FR");
  });

  it("type 11 (member removed): clickable → the project list", () => {
    render(
      <NotificationCard
        notification={makeNotification({
          type: 11,
          extraInfo: { roleChange: { project: { id: 127, name: "Demo" } } },
        })}
        onRead={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByText("You have been removed from Demo."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(navigate).toHaveBeenCalledWith({ to: "/project" });
  });

  it("type 12 (role assigned admin, action 1): 'Admin', clickable → team/operators", () => {
    render(
      <NotificationCard
        notification={makeNotification({
          type: 12,
          extraInfo: {
            roleChange: {
              project: { id: 127, name: "Demo" },
              roleCode: "project_admin",
              action: 1,
            },
          },
        })}
        onRead={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByText("Your role in Demo has been changed to Admin."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(navigate).toHaveBeenCalledWith({
      to: "/project/$projectId/team/operators",
      params: { projectId: "127" },
    });
  });

  it("type 12 (admin removed, action 2): demote → 'Member'", () => {
    // The wire sends roleCode: project_admin for every role change; action 2
    // (removed) means the admin overlay was taken off, leaving the member base.
    render(
      <NotificationCard
        notification={makeNotification({
          type: 12,
          extraInfo: {
            roleChange: {
              project: { id: 127, name: "Demo" },
              roleCode: "project_admin",
              action: 2,
            },
          },
        })}
        onRead={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByText("Your role in Demo has been changed to Member."),
    ).toBeInTheDocument();
  });

  it("type 12 (role changed): falls back to the top-level projectId when roleChange.project is absent", () => {
    render(
      <NotificationCard
        notification={makeNotification({
          type: 12,
          projectId: 125,
          extraInfo: { roleChange: { roleCode: "project_member" } },
        })}
        onRead={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    // Still clickable via the top-level projectId (the nested project is gone).
    fireEvent.click(screen.getByRole("button"));
    expect(navigate).toHaveBeenCalledWith({
      to: "/project/$projectId/team/operators",
      params: { projectId: "125" },
    });
  });

  it("type 15: renders the scheduled-task icon instead of a worker avatar", () => {
    render(
      <NotificationCard
        notification={makeNotification({
          type: 15,
          content: "Daily report",
          extraInfo: {
            scheduledTaskFinished: {
              task: { id: 7, title: "Daily report" },
              status: 3,
              scheduledTaskRunId: 8,
              scheduledFor: 1_787_000_000_000,
            },
          },
        })}
        onRead={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByTestId("scheduled-task-notification-icon")).toHaveClass(
      "bg-surface-sunken",
      "size-8",
      "rounded-full",
    );
    expect(screen.queryByTestId("avatar-root")).not.toBeInTheDocument();
  });

  it.each([
    ["NO_PLAN", 1],
    ["COMPLETED", 3],
  ] as const)(
    "type 15 %s: renders the scheduled task success copy",
    (_name, status) => {
      render(
        <NotificationCard
          notification={makeNotification({
            type: 15,
            content: "Daily report",
            extraInfo: {
              scheduledTaskFinished: {
                task: { id: 7, title: "Daily report" },
                status,
                scheduledTaskRunId: 8,
                conversationId: 91,
                agentInstance: { id: 24 },
                scheduledFor: 1_787_000_000_000,
              },
            },
          })}
          onRead={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText("Scheduled task completed")).toBeVisible();
      expect(
        screen.getByText('"Daily report" has completed successfully.'),
      ).toBeVisible();
      expect(screen.getByRole("button")).toBeVisible();
    },
  );

  it.each([
    ["completed", 3],
    ["failed", 4],
  ] as const)(
    "type 15 %s: marks read and opens its chat history from payload IDs",
    (_name, status) => {
      const onClose = vi.fn();
      const onRead = vi.fn();
      render(
        <NotificationCard
          notification={makeNotification({
            id: 15,
            type: 15,
            status: 2,
            content: "Daily report",
            extraInfo: {
              scheduledTaskFinished: {
                task: { id: 7, title: "Daily report" },
                status,
                scheduledTaskRunId: 8,
                conversationId: 91,
                agentInstance: { id: 24 },
                scheduledFor: 1_787_000_000_000,
              },
            },
          })}
          onRead={onRead}
          onClose={onClose}
        />,
      );

      fireEvent.click(screen.getByRole("button"));

      expect(onClose).toHaveBeenCalledOnce();
      expect(onRead).toHaveBeenCalledWith(15);
      expect(navigate).toHaveBeenCalledWith({
        to: "/digital-worker/$agentId/collaboration/$conversationId",
        params: { agentId: "24", conversationId: "91" },
      });
    },
  );

  it.each([
    ["missing worker", { conversationId: 91 }],
    ["missing conversation", { agentInstance: { id: 24 } }],
    ["zero worker", { agentInstance: { id: 0 }, conversationId: 91 }],
    ["zero conversation", { agentInstance: { id: 24 }, conversationId: 0 }],
  ] as const)("type 15 with %s remains read-only", (_name, ids) => {
    render(
      <NotificationCard
        notification={makeNotification({
          type: 15,
          content: "Daily report",
          extraInfo: {
            scheduledTaskFinished: {
              task: { id: 7, title: "Daily report" },
              status: 3,
              scheduledTaskRunId: 8,
              ...ids,
              scheduledFor: 1_787_000_000_000,
            },
          },
        })}
        onRead={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("type 15 failed: renders the scheduled task failure copy", () => {
    render(
      <NotificationCard
        notification={makeNotification({
          type: 15,
          content: "Daily report",
          extraInfo: {
            scheduledTaskFinished: {
              task: { id: 7, title: "Daily report" },
              status: 4,
              scheduledTaskRunId: 8,
              scheduledFor: 1_787_000_000_000,
            },
          },
        })}
        onRead={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Scheduled task failed")).toBeVisible();
    expect(screen.getByText('"Daily report" has failed.')).toBeVisible();
  });

  it("type 15 unknown status: renders the scheduled task failure copy", () => {
    render(
      <NotificationCard
        notification={makeNotification({
          type: 15,
          content: "Daily report",
          extraInfo: {
            scheduledTaskFinished: {
              task: { id: 7, title: "Daily report" },
              status: 0,
              scheduledTaskRunId: 8,
              scheduledFor: 1_787_000_000_000,
            },
          },
        })}
        onRead={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Scheduled task failed")).toBeVisible();
    expect(screen.getByText('"Daily report" has failed.')).toBeVisible();
  });

  it("type 15 future status: uses neutral finished copy", () => {
    const notification = notificationSchema.parse({
      id: 15,
      type: 15,
      status: 2,
      content: "Daily report",
      extraInfo: {
        scheduledTaskFinished: {
          task: { id: 7, title: "Daily report" },
          status: 99,
          scheduledTaskRunId: 8,
          scheduledFor: 1_787_000_000_000,
        },
      },
      createdAt: 1_787_000_100_000,
      updatedAt: 1_787_000_100_000,
    });
    render(
      <NotificationCard
        notification={notification}
        onRead={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Scheduled task finished")).toBeVisible();
    expect(screen.getByText('"Daily report" has finished.')).toBeVisible();
  });

  it("type 15 blank task title: falls back to notification content", () => {
    render(
      <NotificationCard
        notification={makeNotification({
          type: 15,
          content: "Fallback report",
          extraInfo: {
            scheduledTaskFinished: {
              task: { id: 7, title: "   " },
              status: 3,
              scheduledTaskRunId: 8,
              scheduledFor: 1_787_000_000_000,
            },
          },
        })}
        onRead={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByText('"Fallback report" has completed successfully.'),
    ).toBeVisible();
  });

  it("type 15 human-input status: uses neutral finished copy", () => {
    render(
      <NotificationCard
        notification={makeNotification({
          type: 15,
          content: "Daily report",
          extraInfo: {
            scheduledTaskFinished: {
              task: { id: 7, title: "Daily report" },
              status: 5,
              scheduledTaskRunId: 8,
              scheduledFor: 1_787_000_000_000,
            },
          },
        })}
        onRead={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Scheduled task finished")).toBeVisible();
    expect(screen.getByText('"Daily report" has finished.')).toBeVisible();
  });

  it("renders nothing for an unknown type with no content", () => {
    const { container } = render(
      <NotificationCard
        notification={makeNotification({ type: undefined, content: "" })}
        onRead={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
