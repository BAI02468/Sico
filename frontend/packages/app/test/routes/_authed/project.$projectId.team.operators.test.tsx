import {
  membershipKeys,
  projectMembersQueryOptions,
} from "@sico/shared/features/membership/index.ts";
import { MembersPage } from "@sico/shared/features/team/index.ts";
import { isNotFound } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Route } from "../../../src/routes/_authed/project.$projectId.team.operators";

vi.mock("@sico/shared/features/team/index.ts", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@sico/shared/features/team/index.ts")
    >();
  return {
    ...actual,
    MembersPage: vi.fn(
      ({ projectId, activeTab }: { projectId: number; activeTab: string }) => (
        <div
          data-testid="members-page"
          data-project-id={projectId}
          data-active-tab={activeTab}
        />
      ),
    ),
  };
});

function requireDefined<T>(value: T | undefined, label: string): T {
  if (value === undefined) {
    throw new Error(`${label} is required`);
  }
  return value;
}

function getBeforeLoad(): Extract<
  NonNullable<typeof Route.options.beforeLoad>,
  CallableFunction
> {
  const beforeLoad = requireDefined(
    Route.options.beforeLoad,
    "operators route beforeLoad",
  );
  if (typeof beforeLoad !== "function") {
    throw new Error("operators route beforeLoad must be a function");
  }
  return beforeLoad;
}

function getLoader(): Extract<
  NonNullable<typeof Route.options.loader>,
  CallableFunction
> {
  const loader = requireDefined(Route.options.loader, "operators route loader");
  if (typeof loader !== "function") {
    throw new Error("operators route loader must be a function");
  }
  return loader;
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.mocked(MembersPage).mockClear();
});

describe("/_authed/project/$projectId/team/operators", () => {
  it.each(["abc", "0", "-1", "1.5"])(
    "rejects invalid positive integer projectId %s",
    (projectId) => {
      try {
        Reflect.apply(getBeforeLoad(), undefined, [{ params: { projectId } }]);
        throw new Error("expected notFound()");
      } catch (error) {
        expect(isNotFound(error)).toBe(true);
      }
    },
  );

  it("accepts a positive integer projectId", () => {
    expect(
      Reflect.apply(getBeforeLoad(), undefined, [
        { params: { projectId: "42" } },
      ]),
    ).toBeUndefined();
  });

  it("prefetches Membership Project roster options with a numeric ID", () => {
    const prefetchQuery = vi.fn().mockResolvedValue(undefined);
    const apiClient = axios.create();

    Reflect.apply(getLoader(), undefined, [
      {
        context: { queryClient: { prefetchQuery }, apiClient },
        params: { projectId: "42" },
      },
    ]);

    const expected = projectMembersQueryOptions(42, apiClient);
    expect(prefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: membershipKeys.project(42),
        staleTime: expected.staleTime,
      }),
    );
  });

  it("returns synchronously while the prefetch remains unresolved", () => {
    const prefetchQuery = vi.fn(() => new Promise(() => {}));

    expect(
      Reflect.apply(getLoader(), undefined, [
        {
          context: {
            queryClient: { prefetchQuery },
            apiClient: axios.create(),
          },
          params: { projectId: "42" },
        },
      ]),
    ).toBeUndefined();
  });

  it("mounts the Team MembersPage with the numeric Project ID", () => {
    vi.spyOn(Route, "useParams").mockReturnValue({ projectId: "42" });
    const Component = requireDefined(
      Route.options.component,
      "operators route component",
    );

    render(<Component />);

    const membersPage = screen.getByTestId("members-page");
    expect(membersPage).toHaveAttribute("data-project-id", "42");
    expect(membersPage).toHaveAttribute("data-active-tab", "humans");
  });
});
