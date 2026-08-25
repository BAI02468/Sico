import { toast } from "@sico/ui";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectUserNotFoundError } from "@/features/membership";
import { InviteMemberDialog } from "@/features/team/components/invite-member-dialog";
import { useInviteMemberByEmailMutation } from "@/features/team/hooks/use-invite-member-mutation";

vi.mock("@sico/ui", async (importActual) => {
  const actual = await importActual<typeof import("@sico/ui")>();
  return { ...actual, toast: { success: vi.fn(), error: vi.fn() } };
});

vi.mock("@/features/team/hooks/use-invite-member-mutation", () => ({
  useInviteMemberByEmailMutation: vi.fn(),
}));

const mockedUseInviteMemberByEmailMutation = vi.mocked(
  useInviteMemberByEmailMutation,
);

type InviteMutation = ReturnType<typeof useInviteMemberByEmailMutation>;

function mockMutation({
  mutate = vi.fn(),
  isPending = false,
}: {
  mutate?: InviteMutation["mutate"];
  isPending?: boolean;
} = {}): InviteMutation {
  const state = {
    context: undefined,
    data: undefined,
    error: null,
    failureCount: 0,
    failureReason: null,
    isError: false,
    isPaused: false,
    isSuccess: false,
    mutate,
    mutateAsync: vi.fn(),
    reset: vi.fn(),
    submittedAt: 0,
  } as const;
  return isPending
    ? {
        ...state,
        isIdle: false,
        isPending: true,
        status: "pending",
        variables: { email: "pending@example.com", roleCode: "project_member" },
      }
    : {
        ...state,
        isIdle: true,
        isPending: false,
        status: "idle",
        variables: undefined,
      };
}

function renderDialog(ui: ReactElement): void {
  render(ui);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseInviteMemberByEmailMutation.mockReturnValue(mockMutation());
});

describe("InviteMemberDialog", () => {
  it("titles the dialog with the project name", () => {
    renderDialog(
      <InviteMemberDialog
        projectId={7}
        projectName="Acme"
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading")).toHaveTextContent("Invite to Acme");
  });

  it("offers Admin and Member role options, defaulting to Member", async () => {
    const user = userEvent.setup();
    renderDialog(
      <InviteMemberDialog
        projectId={7}
        projectName="Acme"
        open
        onOpenChange={vi.fn()}
      />,
    );

    const roleTrigger = screen.getByRole("button", { name: "Role" });
    expect(roleTrigger).toHaveTextContent("Member");

    await user.click(roleTrigger);
    expect(
      await screen.findByRole("menuitemradio", { name: "Admin" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemradio", { name: "Member" }),
    ).toBeInTheDocument();
  });

  it("closes the menu and updates the trigger after picking a role", async () => {
    const user = userEvent.setup();
    renderDialog(
      <InviteMemberDialog
        projectId={7}
        projectName="Acme"
        open
        onOpenChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Role" }));
    await user.click(
      await screen.findByRole("menuitemradio", { name: "Admin" }),
    );

    await waitFor(() =>
      expect(screen.queryByRole("menuitemradio")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Role" })).toHaveTextContent(
      "Admin",
    );
  });

  it("disables Invite until an email is entered", async () => {
    const user = userEvent.setup();
    renderDialog(
      <InviteMemberDialog
        projectId={7}
        projectName="Acme"
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Invite" })).toBeDisabled();

    await user.type(screen.getByLabelText("Email"), "teammate@company.com");

    expect(screen.getByRole("button", { name: "Invite" })).toBeEnabled();
  });

  it("does not mutate for a malformed email", async () => {
    const mutate = vi.fn();
    mockedUseInviteMemberByEmailMutation.mockReturnValue(
      mockMutation({ mutate }),
    );
    const user = userEvent.setup();
    renderDialog(
      <InviteMemberDialog
        projectId={7}
        projectName="Acme"
        open
        onOpenChange={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("Email"), "notanemail");
    await user.click(screen.getByRole("button", { name: "Invite" }));

    expect(await screen.findByText("Enter a valid email")).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("submits the email and role code to the mutation", async () => {
    const mutate = vi.fn();
    mockedUseInviteMemberByEmailMutation.mockReturnValue(
      mockMutation({ mutate }),
    );
    const user = userEvent.setup();
    renderDialog(
      <InviteMemberDialog
        projectId={7}
        projectName="Acme"
        open
        onOpenChange={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("Email"), "teammate@company.com");
    await user.click(screen.getByRole("button", { name: "Role" }));
    await user.click(
      await screen.findByRole("menuitemradio", { name: "Admin" }),
    );
    await user.click(screen.getByRole("button", { name: "Invite" }));

    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        { email: "teammate@company.com", roleCode: "project_admin" },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      ),
    );
  });

  it("maps ProjectUserNotFoundError to not-registered feedback", async () => {
    const mutate = vi.fn();
    mockedUseInviteMemberByEmailMutation.mockReturnValue(
      mockMutation({ mutate }),
    );
    const user = userEvent.setup();
    renderDialog(
      <InviteMemberDialog
        projectId={7}
        projectName="Acme"
        open
        onOpenChange={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("Email"), "ghost@company.com");
    await user.click(screen.getByRole("button", { name: "Invite" }));
    const callbacks = mutate.mock.calls[0]?.[1];
    await act(async () => {
      await callbacks.onError(new ProjectUserNotFoundError());
    });

    expect(toast.error).toHaveBeenCalledWith("This user isn't registered yet.");
  });

  it("maps other mutation errors to generic invite feedback", async () => {
    const mutate = vi.fn();
    mockedUseInviteMemberByEmailMutation.mockReturnValue(
      mockMutation({ mutate }),
    );
    const user = userEvent.setup();
    renderDialog(
      <InviteMemberDialog
        projectId={7}
        projectName="Acme"
        open
        onOpenChange={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("Email"), "user@company.com");
    await user.click(screen.getByRole("button", { name: "Invite" }));
    const callbacks = mutate.mock.calls[0]?.[1];
    await act(async () => {
      await callbacks.onError(new Error("backend"));
    });

    expect(toast.error).toHaveBeenCalledWith("We couldn't invite this user.");
  });

  it("disables the button and shows the pending label while inviting", () => {
    mockedUseInviteMemberByEmailMutation.mockReturnValue(
      mockMutation({ isPending: true }),
    );
    renderDialog(
      <InviteMemberDialog
        projectId={7}
        projectName="Acme"
        open
        onOpenChange={vi.fn()}
      />,
    );

    const button = screen.getByRole("button", { name: "Inviting…" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("toasts and closes after a successful invite", async () => {
    const mutate = vi.fn();
    const onOpenChange = vi.fn();
    mockedUseInviteMemberByEmailMutation.mockReturnValue(
      mockMutation({ mutate }),
    );
    const user = userEvent.setup();
    renderDialog(
      <InviteMemberDialog
        projectId={7}
        projectName="Acme"
        open
        onOpenChange={onOpenChange}
      />,
    );

    await user.type(screen.getByLabelText("Email"), "user@company.com");
    await user.click(screen.getByRole("button", { name: "Invite" }));
    const callbacks = mutate.mock.calls[0]?.[1];
    await act(async () => {
      await callbacks.onSuccess(7);
    });

    expect(toast.success).toHaveBeenCalledWith("Member invited.", {
      invert: true,
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
