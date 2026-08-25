import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => (
    <a href="/studio">{children}</a>
  ),
}));

const { StudioSetupHeader } =
  await import("@/features/studio/components/studio-setup-header");

function renderHeader({
  canManageEditors,
  canDelete,
  showMoreActions = true,
  onManageEditors = vi.fn(),
  onDelete = vi.fn(),
}: {
  canManageEditors: boolean;
  canDelete: boolean;
  showMoreActions?: boolean;
  onManageEditors?: () => void;
  onDelete?: () => void;
}): void {
  render(
    <I18nProvider i18n={i18n}>
      <StudioSetupHeader
        editable
        canPublish
        canManageEditors={canManageEditors}
        canDelete={canDelete}
        showMoreActions={showMoreActions}
        formId="studio-setup-form"
        saveDisabled={false}
        onPublish={vi.fn()}
        onManageEditors={onManageEditors}
        onDelete={onDelete}
      />
    </I18nProvider>,
  );
}

describe("StudioSetupHeader actions", () => {
  it("hides the overflow action in create mode", () => {
    renderHeader({
      canManageEditors: false,
      canDelete: false,
      showMoreActions: false,
    });

    expect(
      screen.queryByRole("button", { name: "More setup actions" }),
    ).not.toBeInTheDocument();
  });

  it("keeps title and actions overflow-safe on narrow widths", () => {
    renderHeader({ canManageEditors: true, canDelete: true });

    const header = screen.getByRole("banner");
    const title = screen.getByRole("heading", { name: "Digital Worker Setup" });
    expect(header).toHaveClass("gap-4");
    expect(title.parentElement).toHaveClass("min-w-0");
    expect(title).toHaveClass("truncate");
    expect(
      screen.getByRole("button", { name: "Save" }).parentElement,
    ).toHaveClass("shrink-0");
  });

  it("renders 32px Save and Publish actions with matching visual hierarchy", () => {
    renderHeader({ canManageEditors: true, canDelete: true });

    expect(screen.getByRole("button", { name: "Save" })).toHaveClass("h-8");
    expect(screen.getByRole("button", { name: "Save" })).toHaveClass(
      "bg-button-secondary-fill-rest",
    );
    expect(screen.getByRole("button", { name: "Publish" })).toHaveClass("h-8");
    expect(screen.getByRole("button", { name: "Publish" })).toHaveClass(
      "bg-button-primary-fill-rest",
    );
  });

  it("keeps Manage and Delete visible but unavailable for non-owners", async () => {
    const user = userEvent.setup();
    renderHeader({ canManageEditors: false, canDelete: false });

    await user.click(
      screen.getByRole("button", { name: "More setup actions" }),
    );

    const manage = await screen.findByRole("menuitem", {
      name: "Manage editors",
    });
    expect(manage).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByRole("menuitem", { name: "Delete digital worker" }),
    ).toBeVisible();
  });

  it("calls owner menu actions", async () => {
    const user = userEvent.setup();
    const onManageEditors = vi.fn();
    const onDelete = vi.fn();
    renderHeader({
      canManageEditors: true,
      canDelete: true,
      onManageEditors,
      onDelete,
    });

    await user.click(
      screen.getByRole("button", { name: "More setup actions" }),
    );
    await user.click(
      await screen.findByRole("menuitem", { name: "Manage editors" }),
    );
    expect(onManageEditors).toHaveBeenCalledOnce();

    await user.click(
      screen.getByRole("button", { name: "More setup actions" }),
    );
    await user.click(
      await screen.findByRole("menuitem", { name: "Delete digital worker" }),
    );
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
