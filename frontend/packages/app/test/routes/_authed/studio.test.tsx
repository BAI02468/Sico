import {
  AgentSetupPage,
  CreateSetupPage,
} from "@sico/shared/features/studio/index.ts";
import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@sico/shared/features/studio/index.ts", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@sico/shared/features/studio/index.ts")
    >();
  return {
    ...actual,
    CreateSetupPage: vi.fn(() => <div data-testid="create-setup-page" />),
    AgentSetupPage: vi.fn(({ agentId }: { agentId: string }) => (
      <div data-agent-id={agentId} data-testid="agent-setup-page" />
    )),
  };
});

function requireDefined<T>(value: T | undefined, label: string): T {
  if (value === undefined) {
    throw new Error(`${label} is required`);
  }
  return value;
}

describe("studio routes", () => {
  let indexRoute: typeof import("../../../src/routes/_authed/studio.index").Route;
  let createRoute: typeof import("../../../src/routes/_authed/studio.setup").Route;
  let editRoute: typeof import("../../../src/routes/_authed/studio.$agentId.setup").Route;

  beforeAll(async () => {
    ({ Route: indexRoute } =
      await import("../../../src/routes/_authed/studio.index"));
    ({ Route: createRoute } =
      await import("../../../src/routes/_authed/studio.setup"));
    ({ Route: editRoute } =
      await import("../../../src/routes/_authed/studio.$agentId.setup"));
  });

  it.each([
    ["index", () => indexRoute],
    ["create", () => createRoute],
    ["edit", () => editRoute],
  ])("leaves the %s route pending component unset", (_name, route) => {
    expect(route().options.pendingComponent).toBeUndefined();
  });

  it("keeps the create loader synchronous while prefetching roles", () => {
    const prefetchQuery = vi.fn(() => new Promise<never>(() => {}));
    const loader = createRoute.options.loader;
    if (typeof loader !== "function") {
      throw new Error("create loader is required");
    }

    const result = Reflect.apply(loader, undefined, [
      { context: { queryClient: { prefetchQuery }, apiClient: {} } },
    ]);

    expect(result).toBeUndefined();
    expect(prefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["agent-roles"] }),
    );
  });

  it("keeps the edit loader synchronous while prefetching its setup data", () => {
    const prefetchQuery = vi.fn(() => new Promise<never>(() => {}));
    const prefetchInfiniteQuery = vi.fn(() => new Promise<never>(() => {}));
    const loader = editRoute.options.loader;
    if (typeof loader !== "function") {
      throw new Error("edit loader is required");
    }

    const result = Reflect.apply(loader, undefined, [
      {
        context: {
          queryClient: { prefetchQuery, prefetchInfiniteQuery },
          apiClient: {},
        },
        params: { agentId: "agent-1" },
      },
    ]);

    expect(result).toBeUndefined();
    expect(prefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["studio-single-agent", "agent-1"],
      }),
    );
    expect(prefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["agent-roles"] }),
    );
    expect(prefetchInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["skills", "infinite", { agentId: "agent-1", pageSize: 10 }],
      }),
    );
  });

  it.each([
    ["create", () => createRoute, "Create Digital Worker · SICO"],
    ["edit", () => editRoute, "Setup · SICO"],
  ])("preserves the %s document title", (_name, route, title) => {
    const head = requireDefined(route().options.head, "studio route head");

    expect(Reflect.apply(head, undefined, [])).toEqual({
      meta: [{ title }],
    });
  });

  it("keeps the create setup page component", () => {
    expect(createRoute.options.component).toBe(CreateSetupPage);
  });

  it("passes the edit route agent parameter to the setup page", () => {
    vi.spyOn(editRoute, "useParams").mockReturnValue({ agentId: "agent-1" });
    const Component = requireDefined(
      editRoute.options.component,
      "edit route component",
    );

    render(<Component />);

    expect(screen.getByTestId("agent-setup-page")).toHaveAttribute(
      "data-agent-id",
      "agent-1",
    );
    expect(AgentSetupPage).toHaveBeenCalled();
  });
});
