import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@sico/shared/features/studio/index.ts", () => ({
  Studio: ({ activeTab }: { activeTab: string }) => (
    <div data-testid="studio" data-active-tab={activeTab} />
  ),
}));

function requireDefined<T>(value: T | undefined, label: string): T {
  if (value === undefined) {
    throw new Error(`${label} is required`);
  }
  return value;
}

describe("Studio tab routes", () => {
  let indexRoute: typeof import("../../../src/routes/_authed/studio.index").Route;
  let allRoute: typeof import("../../../src/routes/_authed/studio.all").Route;
  let createdRoute: typeof import("../../../src/routes/_authed/studio.created").Route;
  let editableRoute: typeof import("../../../src/routes/_authed/studio.editable").Route;

  beforeAll(async () => {
    ({ Route: indexRoute } =
      await import("../../../src/routes/_authed/studio.index"));
    ({ Route: allRoute } =
      await import("../../../src/routes/_authed/studio.all"));
    ({ Route: createdRoute } =
      await import("../../../src/routes/_authed/studio.created"));
    ({ Route: editableRoute } =
      await import("../../../src/routes/_authed/studio.editable"));
  });

  it("redirects the bare Studio route to the All tab", () => {
    expect(indexRoute.options.beforeLoad).toBeTypeOf("function");
  });

  it("mounts the All tab", () => {
    const Component = requireDefined(
      allRoute.options.component,
      "All Studio tab component",
    );
    render(<Component />);
    expect(screen.getByTestId("studio")).toHaveAttribute(
      "data-active-tab",
      "all",
    );
  });

  it("mounts the Created tab", () => {
    const Component = requireDefined(
      createdRoute.options.component,
      "Created Studio tab component",
    );
    render(<Component />);
    expect(screen.getByTestId("studio")).toHaveAttribute(
      "data-active-tab",
      "created",
    );
  });

  it("mounts the Editable tab", () => {
    const Component = requireDefined(
      editableRoute.options.component,
      "Editable Studio tab component",
    );
    render(<Component />);
    expect(screen.getByTestId("studio")).toHaveAttribute(
      "data-active-tab",
      "editable",
    );
  });
});
