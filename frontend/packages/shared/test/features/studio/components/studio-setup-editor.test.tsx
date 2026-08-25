import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ComponentProps, type ReactNode, useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSkillSaveRegistry } from "@/features/skill/components/setup/skill-save-registry";
import { StudioSetupEditor } from "@/features/studio/components/studio-setup-editor";

const saveRegisteredSkill = vi.fn().mockResolvedValue(undefined);
const { blocker, useBlockerMock } = vi.hoisted(() => ({
  blocker: {
    status: "idle" as "idle" | "blocked",
    reset: vi.fn(),
    proceed: vi.fn(),
  },
  useBlockerMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => (
    <a href="/studio">{children}</a>
  ),
  useBlocker: useBlockerMock,
}));

vi.mock("@/features/skill", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/skill")>()),
  SetupSkillSection: ({
    agentId,
    editable,
  }: {
    agentId?: string;
    editable: boolean;
  }) => {
    const { register } = useSkillSaveRegistry();
    useEffect(() => {
      if (agentId !== "agent-with-draft") {
        return undefined;
      }
      return register({
        id: "skill-1",
        dirty: true,
        status: "scheduled",
        save: saveRegisteredSkill,
        flush: async () => {
          await saveRegisteredSkill();
          return true;
        },
      });
    }, [agentId, register]);
    return (
      <button type="button" disabled={!editable}>
        Add skills
      </button>
    );
  },
}));

const roleOptions = [{ name: "Tester", value: "tester" }];
const testerRole = "tester";
const emptyRole = "";

type EditorProps = Partial<ComponentProps<typeof StudioSetupEditor>>;

function renderEditor({
  name = "",
  role = emptyRole,
  roleOptions: nextRoleOptions = roleOptions,
  editable = true,
  agentId,
  onBasicSave = vi.fn().mockResolvedValue(undefined),
  onCreated,
  onPublish,
}: EditorProps = {}): ReturnType<typeof render> {
  return render(
    <I18nProvider i18n={i18n}>
      <StudioSetupEditor
        name={name}
        role={role}
        roleOptions={nextRoleOptions}
        editable={editable}
        agentId={agentId}
        onBasicSave={onBasicSave}
        onCreated={onCreated}
        onPublish={onPublish}
      />
    </I18nProvider>,
  );
}

describe("StudioSetupEditor", () => {
  beforeEach(() => {
    saveRegisteredSkill.mockClear();
    blocker.status = "idle";
    blocker.reset.mockClear();
    blocker.proceed.mockClear();
    useBlockerMock.mockClear();
    useBlockerMock.mockReturnValue(blocker);
  });

  it("autosaves existing Basic Info without a Save button", async () => {
    const user = userEvent.setup();
    const onBasicSave = vi.fn().mockResolvedValue(undefined);
    renderEditor({ agentId: "existing-agent", onBasicSave });

    await user.type(
      screen.getByRole("textbox", { name: /role name/i }),
      "  Visual Bot  ",
    );
    await user.click(screen.getByRole("combobox", { name: "Industry Type" }));
    await user.click(await screen.findByRole("option", { name: "Tester" }));

    expect(
      screen.queryByRole("button", { name: "Save" }),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(onBasicSave).toHaveBeenCalledWith({
        name: "Visual Bot",
        role: "tester",
      }),
    );
    expect(await screen.findByText("Saved")).toBeVisible();
  });

  it("allows pristine Create Save to show required Basic Info errors", async () => {
    const user = userEvent.setup();
    const onBasicSave = vi.fn().mockResolvedValue(undefined);
    renderEditor({ onBasicSave });

    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeEnabled();
    await user.click(save);

    expect(await screen.findByText("Role Name is required")).toBeVisible();
    expect(screen.getByText("Industry Type is required")).toBeVisible();
    expect(onBasicSave).not.toHaveBeenCalled();
  });

  it("focuses the first invalid field without saving", async () => {
    const user = userEvent.setup();
    const onBasicSave = vi.fn().mockResolvedValue(undefined);
    renderEditor({ onBasicSave });

    await user.type(screen.getByRole("textbox", { name: /role name/i }), "   ");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Role Name is required")).toBeVisible();
    expect(screen.getByRole("textbox", { name: /role name/i })).toHaveFocus();
    expect(onBasicSave).not.toHaveBeenCalled();
  });

  it("focuses Industry Type when it is the only invalid field", async () => {
    const user = userEvent.setup();
    const onBasicSave = vi.fn().mockResolvedValue(undefined);
    renderEditor({ onBasicSave });

    await user.type(
      screen.getByRole("textbox", { name: /role name/i }),
      "Visual Bot",
    );
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Industry Type is required")).toBeVisible();
    expect(
      screen.getByRole("combobox", { name: "Industry Type" }),
    ).toHaveFocus();
    expect(onBasicSave).not.toHaveBeenCalled();
  });

  it("keeps a failed autosave retryable", async () => {
    const user = userEvent.setup();
    const onBasicSave = vi
      .fn()
      .mockRejectedValueOnce(new Error("save failed"))
      .mockResolvedValueOnce(undefined);
    renderEditor({ agentId: "existing-agent", onBasicSave });

    await user.type(
      screen.getByRole("textbox", { name: /role name/i }),
      "Visual Bot",
    );
    await user.click(screen.getByRole("combobox", { name: "Industry Type" }));
    await user.click(await screen.findByRole("option", { name: "Tester" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(onBasicSave).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Saved")).toBeVisible();
  });

  it("blocks leaving a dirty Edit page but allows same-path navigation", async () => {
    const user = userEvent.setup();
    renderEditor({
      agentId: "existing-agent",
      name: "Visual Bot",
      role: "tester",
    });

    await user.type(
      screen.getByRole("textbox", { name: /role name/i }),
      " updated",
    );

    const options = useBlockerMock.mock.calls.at(-1)?.[0];
    expect(
      options.shouldBlockFn({
        current: { pathname: "/studio/agent/setup" },
        next: { pathname: "/studio/all" },
      }),
    ).toBe(true);
    expect(
      options.shouldBlockFn({
        current: { pathname: "/studio/agent/setup" },
        next: { pathname: "/studio/agent/setup" },
      }),
    ).toBe(false);
    expect(options.enableBeforeUnload()).toBe(true);
  });

  it("continues navigation once a deferred autosave flush succeeds", async () => {
    let resolveSave: (() => void) | undefined;
    const onBasicSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );
    const view = renderEditor({
      agentId: "existing-agent",
      name: "Visual Bot",
      role: "tester",
      onBasicSave,
    });
    const user = userEvent.setup();
    await user.type(
      screen.getByRole("textbox", { name: /role name/i }),
      " updated",
    );
    blocker.status = "blocked";
    view.rerender(
      <I18nProvider i18n={i18n}>
        <StudioSetupEditor
          agentId="existing-agent"
          name="Visual Bot"
          role={testerRole}
          roleOptions={roleOptions}
          editable
          onBasicSave={onBasicSave}
        />
      </I18nProvider>,
    );

    expect(blocker.proceed).not.toHaveBeenCalled();
    await waitFor(() => expect(onBasicSave).toHaveBeenCalledOnce());
    resolveSave?.();
    await waitFor(() => expect(blocker.proceed).toHaveBeenCalledOnce());
  });

  it("keeps the dirty draft when a failed flush is canceled", async () => {
    const user = userEvent.setup();
    const onBasicSave = vi.fn().mockRejectedValue(new Error("offline"));
    const view = renderEditor({
      agentId: "existing-agent",
      name: "Visual Bot",
      role: "tester",
      onBasicSave,
    });
    const name = screen.getByRole("textbox", { name: /role name/i });
    await user.type(name, " updated");

    blocker.status = "blocked";
    view.rerender(
      <I18nProvider i18n={i18n}>
        <StudioSetupEditor
          agentId="existing-agent"
          name="Visual Bot"
          role={testerRole}
          roleOptions={roleOptions}
          editable
          onBasicSave={onBasicSave}
        />
      </I18nProvider>,
    );
    await user.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(blocker.reset).toHaveBeenCalledOnce();
    expect(name).toHaveValue("Visual Bot updated");
  });

  it("discards changes after an automatic flush fails", async () => {
    const user = userEvent.setup();
    const onBasicSave = vi.fn().mockRejectedValue(new Error("offline"));
    const view = renderEditor({
      agentId: "existing-agent",
      name: "Visual Bot",
      role: "tester",
      onBasicSave,
    });
    await user.type(
      screen.getByRole("textbox", { name: /role name/i }),
      " updated",
    );
    blocker.status = "blocked";
    view.rerender(
      <I18nProvider i18n={i18n}>
        <StudioSetupEditor
          agentId="existing-agent"
          name="Visual Bot"
          role={testerRole}
          roleOptions={roleOptions}
          editable
          onBasicSave={onBasicSave}
        />
      </I18nProvider>,
    );

    await user.click(await screen.findByRole("button", { name: "Discard" }));
    expect(blocker.proceed).toHaveBeenCalledOnce();
  });

  it("flushes registered Skills before Publish", async () => {
    const user = userEvent.setup();
    const onPublish = vi.fn();
    renderEditor({
      agentId: "agent-with-draft",
      name: "Visual Bot",
      role: "tester",
      onPublish,
    });

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(saveRegisteredSkill).toHaveBeenCalledOnce();
    expect(onPublish).toHaveBeenCalledOnce();
  });

  it("does not flush Skills while Basic Info is invalid", () => {
    renderEditor({ agentId: "agent-with-draft" });

    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
    expect(saveRegisteredSkill).not.toHaveBeenCalled();
  });

  it("omits the actions overflow for Create", () => {
    renderEditor();

    expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "More setup actions" }),
    ).not.toBeInTheDocument();
  });

  it("opens Publish after a clean editable setup request", async () => {
    const user = userEvent.setup();
    const onPublish = vi.fn();
    renderEditor({ name: "Visual Bot", role: "tester", onPublish });

    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(onPublish).toHaveBeenCalledOnce();
  });

  it("hands clean Create Publish through to Edit", async () => {
    const user = userEvent.setup();
    const onBasicSave = vi.fn().mockResolvedValue("agent-created");
    const onCreated = vi.fn().mockResolvedValue(undefined);
    renderEditor({
      name: "Visual Bot",
      role: "tester",
      onBasicSave,
      onCreated,
    });

    await user.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() =>
      expect(onBasicSave).toHaveBeenCalledWith({
        name: "Visual Bot",
        role: "tester",
      }),
    );
    expect(onCreated).toHaveBeenCalledWith("agent-created", [], true);
  });

  it("hands dirty Create Publish through to Edit", async () => {
    const user = userEvent.setup();
    const onBasicSave = vi.fn().mockResolvedValue("agent-created");
    const onCreated = vi.fn().mockResolvedValue(undefined);
    renderEditor({
      name: "Visual Bot",
      role: "tester",
      onBasicSave,
      onCreated,
    });

    await user.type(
      screen.getByRole("textbox", { name: /role name/i }),
      " updated",
    );
    await user.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() =>
      expect(onBasicSave).toHaveBeenCalledWith({
        name: "Visual Bot updated",
        role: "tester",
      }),
    );
    expect(onCreated).toHaveBeenCalledWith("agent-created", [], true);
  });

  it("opens Publish after dirty Skill saves complete", async () => {
    const user = userEvent.setup();
    const order: string[] = [];
    saveRegisteredSkill.mockImplementation(async () => {
      order.push("save");
    });
    const onPublish = vi.fn(() => {
      order.push("publish");
    });
    renderEditor({
      agentId: "agent-with-draft",
      name: "Visual Bot",
      role: "tester",
      onPublish,
    });

    await user.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(onPublish).toHaveBeenCalledOnce());
    expect(order).toEqual(["save", "publish"]);
  });

  it("does not open Publish when a dirty Basic Info save fails", async () => {
    const user = userEvent.setup();
    const onPublish = vi.fn();
    const onBasicSave = vi.fn().mockRejectedValue(new Error("save failed"));
    renderEditor({
      agentId: "existing-agent",
      name: "Visual Bot",
      role: "tester",
      onBasicSave,
      onPublish,
    });

    await user.type(
      screen.getByRole("textbox", { name: /role name/i }),
      " updated",
    );
    await user.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(onBasicSave).toHaveBeenCalledOnce());
    expect(onPublish).not.toHaveBeenCalled();
  });

  it("preserves a dirty name when server props refetch", async () => {
    const user = userEvent.setup();
    const onBasicSave = vi.fn().mockResolvedValue(undefined);
    const view = renderEditor({
      agentId: "existing-agent",
      name: "Visual Bot",
      role: "tester",
      onBasicSave,
    });

    const name = screen.getByRole("textbox", { name: /role name/i });
    await user.type(name, " updated");

    view.rerender(
      <I18nProvider i18n={i18n}>
        <StudioSetupEditor
          agentId="existing-agent"
          name="Refetched Bot"
          role={testerRole}
          roleOptions={roleOptions}
          editable
          onBasicSave={onBasicSave}
        />
      </I18nProvider>,
    );

    expect(name).toHaveValue("Visual Bot updated");
  });

  it("keeps controls editable and trails changes while autosave is pending", async () => {
    const user = userEvent.setup();
    let resolveSave: (() => void) | undefined;
    const firstSave = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    const onBasicSave = vi
      .fn()
      .mockReturnValueOnce(firstSave)
      .mockResolvedValueOnce(undefined);
    renderEditor({
      agentId: "existing-agent",
      name: "Visual Bot",
      role: "tester",
      onBasicSave,
    });

    const name = screen.getByRole("textbox", { name: /role name/i });
    await user.type(name, " updated");
    await waitFor(() => expect(onBasicSave).toHaveBeenCalledOnce());

    const options = useBlockerMock.mock.calls.at(-1)?.[0];
    expect(
      options.shouldBlockFn({
        current: { pathname: "/studio/agent/setup" },
        next: { pathname: "/studio/all" },
      }),
    ).toBe(true);
    expect(options.enableBeforeUnload()).toBe(true);
    expect(name).toBeEnabled();
    expect(screen.getByRole("button", { name: "Add skills" })).toBeEnabled();

    await user.type(name, " again");
    expect(name).toHaveValue("Visual Bot updated again");
    resolveSave?.();
    await waitFor(() => expect(onBasicSave).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Saved")).toBeVisible();
  });

  it("renders controls read-only when editing is not permitted", () => {
    renderEditor({
      agentId: "existing-agent",
      editable: false,
      name: "Visual Bot",
      role: "tester",
    });

    expect(screen.getByRole("textbox", { name: /role name/i })).toBeDisabled();
    expect(
      screen.getByRole("combobox", { name: "Industry Type" }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Save" }),
    ).not.toBeInTheDocument();
  });
});
