import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { toast } from "@sico/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RbacUser } from "@/features/rbac/schemas/user-role";
import { ApiClientProvider } from "@/services/api-client-context";
import { createTestApiClient } from "@/testing/create-test-api-client";

const listUsersByRole = vi.fn();
const findUserByEmail = vi.fn();
const assignUserRole = vi.fn();
const removeUserRole = vi.fn();

vi.mock("@/features/rbac/services/user-role", () => ({
  listUsersByRole,
  findUserByEmail,
  assignUserRole,
  removeUserRole,
}));

const { StudioManageEditorsDialog } =
  await import("@/features/studio/components/studio-manage-editors-dialog");

const agentId = "a3c0bc10-6d1c-4b33-a866-f3e1b2b91cde";

function renderDialog(
  creatorUsername = "owner@example.com",
  cachedEditors?: RbacUser[],
): void {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
  if (cachedEditors) {
    queryClient.setQueryData(["studio-agent-editors", agentId], cachedEditors);
  }
  const apiClient = createTestApiClient();

  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <I18nProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <ApiClientProvider client={apiClient}>{children}</ApiClientProvider>
        </QueryClientProvider>
      </I18nProvider>
    );
  }

  render(
    <StudioManageEditorsDialog
      agentId={agentId}
      creatorUsername={creatorUsername}
      open
      onOpenChange={vi.fn()}
    />,
    { wrapper: Wrapper },
  );
}

describe("StudioManageEditorsDialog", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    listUsersByRole.mockReset();
    listUsersByRole.mockResolvedValue([
      { id: 7, email: "editor@example.com", alias: "Editor" },
    ]);
    findUserByEmail.mockReset();
    assignUserRole.mockReset();
    removeUserRole.mockReset();
  });

  it("matches the compact Invite editor dialog structure", async () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: "Invite editor" }),
    ).toBeVisible();
    expect(screen.getByRole("dialog")).toHaveClass("p-5", "gap-6");
    expect(screen.getByRole("dialog")).not.toHaveClass("gap-4");
    expect(
      screen.getByPlaceholderText("Invite editors with email"),
    ).toHaveClass("h-8");
    expect(screen.getByRole("button", { name: "Invite" })).toBeDisabled();
    expect(await screen.findByText("owner@example.com")).toBeVisible();
    expect(screen.getByText("Creator")).toBeVisible();
    expect(await screen.findByText("editor@example.com")).toBeVisible();
    expect(screen.getByText("Editor")).toBeVisible();
    expect(screen.getAllByTestId("avatar-root")).toHaveLength(2);
    expect(
      screen.queryByRole("button", { name: /remove owner@example.com/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps the editor remove control at the icon-xs target size", async () => {
    renderDialog();

    await screen.findByText("editor@example.com");
    expect(
      screen.getByRole("button", { name: "Remove editor@example.com" }),
    ).toHaveClass("size-6");
  });

  it("keeps an empty roster compact without empty-state copy", async () => {
    listUsersByRole.mockResolvedValue([]);
    renderDialog();

    const creator = await screen.findByText("owner@example.com");
    const creatorRow = creator.closest(".h-6");
    expect(creatorRow?.parentElement).not.toHaveClass("min-h-20");
    expect(
      screen.queryByText("No additional editors yet."),
    ).not.toBeInTheDocument();
  });

  it("excludes a creator identified by username from the editor roster", async () => {
    listUsersByRole.mockResolvedValue([
      { id: 6, email: "owner@example.com", username: "owner-handle" },
      { id: 7, email: "editor@example.com", alias: "Editor" },
    ]);
    renderDialog("owner-handle");

    expect(await screen.findByText("editor@example.com")).toBeVisible();
    expect(screen.queryByText("owner@example.com")).not.toBeInTheDocument();
  });

  it("rejects an invalid email without looking up a user", async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByText("editor@example.com");

    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      "not-an-email",
    );
    await user.click(screen.getByRole("button", { name: "Invite" }));

    expect(
      await screen.findByText("Enter a valid email address."),
    ).toBeVisible();
    expect(findUserByEmail).not.toHaveBeenCalled();
  });

  it("rejects an already-editor invite without assigning a role", async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByText("editor@example.com");

    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      "EDITOR@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Invite" }));

    expect(
      await screen.findByText("This person is already an editor."),
    ).toBeVisible();
    expect(assignUserRole).not.toHaveBeenCalled();
  });

  it("assigns the resolved user as an agent editor", async () => {
    const user = userEvent.setup();
    findUserByEmail.mockResolvedValue({ id: 9, email: "new@example.com" });
    assignUserRole.mockResolvedValue(undefined);
    renderDialog();
    await screen.findByText("editor@example.com");

    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      "new@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Invite" }));

    await waitFor(() =>
      expect(assignUserRole).toHaveBeenCalledWith(expect.anything(), {
        userId: 9,
        roleCode: "agent_editor",
        scopeType: "agent",
        scopeId: agentId,
      }),
    );
  });

  it("disables invitations while the editor roster is pending", async () => {
    let resolveRoster: ((value: []) => void) | undefined;
    listUsersByRole.mockImplementation(
      () =>
        new Promise<[]>((resolve) => {
          resolveRoster = resolve;
        }),
    );
    renderDialog();

    expect(await screen.findByText("Loading")).toBeVisible();
    expect(
      screen.getByRole("textbox", { name: "Email address" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Invite" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Close" })).toBeEnabled();
    resolveRoster?.([]);
  });

  it("keeps invitations disabled while cached roster data refetches", async () => {
    let resolveRoster: ((value: RbacUser[]) => void) | undefined;
    listUsersByRole.mockImplementation(
      () =>
        new Promise<RbacUser[]>((resolve) => {
          resolveRoster = resolve;
        }),
    );
    renderDialog("owner@example.com", [
      { id: 7, email: "cached@example.com", alias: "Cached" },
    ]);

    expect(await screen.findByText("cached@example.com")).toBeVisible();
    expect(
      screen.getByRole("textbox", { name: "Email address" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Close" })).toBeEnabled();

    resolveRoster?.([{ id: 8, email: "fresh@example.com", alias: "Fresh" }]);
    await waitFor(() =>
      expect(
        screen.getByRole("textbox", { name: "Email address" }),
      ).toBeEnabled(),
    );
  });

  it("disables invitations and retries when the editor roster cannot load", async () => {
    const user = userEvent.setup();
    listUsersByRole.mockRejectedValueOnce(new Error("unavailable"));
    renderDialog();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't load editors.",
    );
    expect(
      screen.getByRole("textbox", { name: "Email address" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Invite" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("editor@example.com")).toBeVisible();
    expect(listUsersByRole).toHaveBeenCalledTimes(2);
  });

  it("removes an editor after confirmation", async () => {
    const user = userEvent.setup();
    removeUserRole.mockResolvedValue(undefined);
    renderDialog();
    await screen.findByText("editor@example.com");

    await user.click(
      screen.getByRole("button", { name: "Remove editor@example.com" }),
    );
    await user.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() =>
      expect(removeUserRole).toHaveBeenCalledWith(expect.anything(), {
        userId: 7,
        roleCode: "agent_editor",
        scopeType: "agent",
        scopeId: agentId,
      }),
    );
    expect(
      screen.queryByRole("dialog", { name: "Remove editor" }),
    ).not.toBeInTheDocument();
  });

  it("keeps editor removal open and toasts when removal fails", async () => {
    const user = userEvent.setup();
    const error = vi.spyOn(toast, "error");
    removeUserRole.mockRejectedValue(new Error("unavailable"));
    renderDialog();
    await screen.findByText("editor@example.com");

    await user.click(
      screen.getByRole("button", { name: "Remove editor@example.com" }),
    );
    await user.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() =>
      expect(error).toHaveBeenCalledWith("Couldn't remove this editor."),
    );
    expect(screen.getByRole("dialog", { name: "Remove editor" })).toBeVisible();
  });

  it("locks the Manage Editors controls while removal is pending", async () => {
    const user = userEvent.setup();
    let resolveRemoval: (() => void) | undefined;
    removeUserRole.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRemoval = resolve;
        }),
    );
    renderDialog();
    await screen.findByText("editor@example.com");

    await user.click(
      screen.getByRole("button", { name: "Remove editor@example.com" }),
    );
    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(
      await screen.findByRole("button", { name: "Removing…" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Invite", hidden: true }),
    ).toBeDisabled();
    expect(
      screen.getByRole("textbox", { name: "Email address", hidden: true }),
    ).toBeDisabled();

    resolveRemoval?.();
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Remove editor" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("does not assign the creator resolved by username", async () => {
    const user = userEvent.setup();
    findUserByEmail.mockResolvedValue({
      id: 6,
      email: "owner@example.com",
      username: "owner-handle",
    });
    renderDialog("owner-handle");
    await screen.findByText("editor@example.com");

    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      "owner@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Invite" }));

    expect(
      await screen.findByText("The creator already has access."),
    ).toBeVisible();
    expect(assignUserRole).not.toHaveBeenCalled();
  });
});
