import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { toast } from "@sico/ui";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const readyRoles = [
  { name: "Product Manager", value: "Product Manager" },
  { name: "Researcher", value: "Researcher" },
];

type CreateInput = { name: string; role: string; organizationId: number };
type CreateCallbacks = {
  onSuccess?: (result: { agentId: string }) => void;
  onError?: (error: unknown) => void;
};
type RolesQuery = {
  data: typeof readyRoles | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: ReturnType<typeof vi.fn>;
};
type OrganizationQuery = {
  data: { id: number } | null | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: ReturnType<typeof vi.fn>;
};

const mutate =
  vi.fn<(input: CreateInput, callbacks?: CreateCallbacks) => void>();
const navigate = vi.fn().mockResolvedValue(undefined);
const refetchRoles = vi.fn().mockResolvedValue(undefined);
const refetchOrganization = vi.fn().mockResolvedValue(undefined);
let mutationPending = false;
let rolesQuery: RolesQuery;
let organizationQuery: OrganizationQuery;

vi.mock("@/features/skill", () => ({
  useRolesQuery: () => rolesQuery,
}));

vi.mock("@/features/studio/hooks/use-single-agent-mutations", () => ({
  useCreateSingleAgentMutation: () => ({
    mutate,
    isPending: mutationPending,
  }),
}));

vi.mock("@/hooks/use-bound-organization", () => ({
  useBoundOrganizationQuery: () => organizationQuery,
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
}));

vi.mock("@sico/ui", async (importActual) => {
  const actual = await importActual<typeof import("@sico/ui")>();
  return { ...actual, toast: { error: vi.fn() } };
});

const { CreateStudioAgentDialog } =
  await import("@/features/studio/components/create-studio-agent-dialog");

function renderDialog(onOpenChange = vi.fn()): ReturnType<typeof render> {
  return render(
    <StrictMode>
      <I18nProvider i18n={i18n}>
        <CreateStudioAgentDialog open onOpenChange={onOpenChange} />
      </I18nProvider>
    </StrictMode>,
  );
}

async function fillValidForm(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await user.type(screen.getByRole("textbox", { name: /role name/i }), "Atlas");
  await user.click(screen.getByRole("combobox", { name: "Industry Type" }));
  await user.click(
    await screen.findByRole("option", { name: "Product Manager" }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mutationPending = false;
  rolesQuery = {
    data: readyRoles,
    isPending: false,
    isError: false,
    refetch: refetchRoles,
  };
  organizationQuery = {
    data: { id: 42 },
    isPending: false,
    isError: false,
    refetch: refetchOrganization,
  };
  navigate.mockResolvedValue(undefined);
  mutate.mockImplementation((_input, callbacks) => {
    callbacks?.onSuccess?.({ agentId: "agent-1" });
  });
});

describe("CreateStudioAgentDialog", () => {
  it("exposes the dialog and required fields accessibly", () => {
    renderDialog();

    expect(
      screen.getByRole("dialog", { name: "Create new Digital Worker role" }),
    ).toBeVisible();
    expect(screen.getByRole("textbox", { name: /role name/i })).toBeRequired();
    expect(
      screen.getByRole("combobox", { name: "Industry Type" }),
    ).toHaveAttribute("aria-required", "true");
  });

  it("shows required errors without creating", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("Role Name is required")).toBeVisible();
    expect(screen.getByText("Industry Type is required")).toBeVisible();
    expect(
      screen.getByRole("combobox", { name: "Industry Type" }),
    ).toHaveAttribute("aria-invalid", "true");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("creates the worker and opens its detail setup", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderDialog(onOpenChange);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(mutate).toHaveBeenCalledWith(
      {
        name: "Atlas",
        role: "Product Manager",
        organizationId: 42,
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
    expect(navigate).toHaveBeenCalledWith({
      to: "/studio/$agentId/setup",
      params: { agentId: "agent-1" },
    });
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("ignores a same-tick duplicate submission", async () => {
    const user = userEvent.setup();
    mutate.mockImplementation(() => undefined);
    renderDialog();

    await fillValidForm(user);
    await user.dblClick(screen.getByRole("button", { name: "Continue" }));

    expect(mutate).toHaveBeenCalledOnce();
  });

  it("retains the form and reports a create failure", async () => {
    const user = userEvent.setup();
    mutate.mockImplementation((_input, callbacks) => {
      callbacks?.onError?.(new Error("create failed"));
    });
    renderDialog();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(toast.error).toHaveBeenCalledWith(
      "We couldn't create this Digital Worker.",
    );
    expect(screen.getByRole("textbox", { name: /role name/i })).toHaveValue(
      "Atlas",
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it("reports navigation failure separately and closes the dialog", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    navigate.mockRejectedValueOnce(new Error("route failed"));
    renderDialog(onOpenChange);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "This Digital Worker was created, but we couldn't open its setup.",
      ),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps submission locked until navigation completes", async () => {
    const user = userEvent.setup();
    let resolveNavigation: (() => void) | undefined;
    navigate.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveNavigation = resolve;
        }),
    );
    renderDialog();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    const saving = await screen.findByRole("button", { name: "Saving…" });
    await user.click(saving);

    expect(mutate).toHaveBeenCalledOnce();
    act(() => resolveNavigation?.());
    expect(
      await screen.findByRole("button", { name: "Continue" }),
    ).toBeEnabled();
  });

  it("disables the form while creation is pending", () => {
    mutationPending = true;
    renderDialog();

    expect(screen.getByRole("textbox", { name: /role name/i })).toBeDisabled();
    expect(
      screen.getByRole("combobox", { name: "Industry Type" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Saving…" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("blocks the close button while creation is pending", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    mutationPending = true;
    renderDialog(onOpenChange);

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("blocks Escape while creation is pending", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    mutationPending = true;
    renderDialog(onOpenChange);

    await user.keyboard("{Escape}");

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("blocks backdrop dismissal while creation is pending", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    mutationPending = true;
    renderDialog(onOpenChange);

    const presentations = screen.getAllByRole("presentation", { hidden: true });
    const backdrop = presentations.at(-1);
    expect(backdrop).toBeDefined();
    if (backdrop) {
      await user.click(backdrop);
    }

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("does not navigate after the dialog unmounts", async () => {
    const user = userEvent.setup();
    let callbacks: CreateCallbacks | undefined;
    mutate.mockImplementation((_input, nextCallbacks) => {
      callbacks = nextCallbacks;
    });
    const view = renderDialog();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));

    view.unmount();
    act(() => callbacks?.onSuccess?.({ agentId: "agent-1" }));

    expect(navigate).not.toHaveBeenCalled();
  });

  it("shows roles loading and prevents submission", () => {
    rolesQuery = {
      ...rolesQuery,
      data: undefined,
      isPending: true,
    };
    renderDialog();

    expect(
      screen.getByRole("combobox", { name: "Industry Type" }),
    ).toHaveTextContent("Loading roles…");
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("shows a recoverable roles error", async () => {
    const user = userEvent.setup();
    rolesQuery = {
      ...rolesQuery,
      data: undefined,
      isError: true,
    };
    renderDialog();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "We couldn't load roles.",
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetchRoles).toHaveBeenCalledOnce();
  });

  it("keeps an empty failed roles refetch recoverable", async () => {
    const user = userEvent.setup();
    rolesQuery = { ...rolesQuery, data: [], isError: true };
    renderDialog();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "We couldn't load roles.",
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetchRoles).toHaveBeenCalledOnce();
  });

  it("keeps cached roles usable after a background refetch fails", () => {
    rolesQuery = { ...rolesQuery, isError: true };
    renderDialog();

    expect(
      screen.getByRole("combobox", { name: "Industry Type" }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows when no roles are available", () => {
    rolesQuery = { ...rolesQuery, data: [] };
    renderDialog();

    expect(
      screen.getByRole("combobox", { name: "Industry Type" }),
    ).toHaveTextContent("No roles available");
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("shows organization loading and prevents submission", () => {
    organizationQuery = {
      ...organizationQuery,
      data: undefined,
      isPending: true,
    };
    renderDialog();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading your organization…",
    );
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("shows a recoverable organization error", async () => {
    const user = userEvent.setup();
    organizationQuery = {
      ...organizationQuery,
      data: undefined,
      isError: true,
    };
    renderDialog();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "We couldn't load your organization.",
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetchOrganization).toHaveBeenCalledOnce();
  });

  it("keeps a cached organization usable after a background refetch fails", () => {
    organizationQuery = { ...organizationQuery, isError: true };
    renderDialog();

    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("explains when no organization is available", () => {
    organizationQuery = { ...organizationQuery, data: null };
    renderDialog();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No organization is available for your account.",
    );
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });
});
