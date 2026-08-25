import { toast } from "@sico/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SetupSkillSection } from "@/features/skill/components/setup/setup-skill-section";
import {
  SkillSaveRegistryProvider,
  useSkillSaveRegistry,
} from "@/features/skill/components/setup/skill-save-registry";
import { makeOkEnvelope } from "@/schemas/api";
import { ApiClientProvider } from "@/services/api-client-context";
import { createTestApiClient } from "@/testing/create-test-api-client";

const { mockUseInfiniteScrollSentinel } = vi.hoisted(() => ({
  mockUseInfiniteScrollSentinel: vi.fn(),
}));

vi.mock("@/hooks/use-infinite-scroll-sentinel", () => ({
  useInfiniteScrollSentinel: (...args: unknown[]) =>
    mockUseInfiniteScrollSentinel(...args),
}));

vi.mock("@sico/ui", async (importActual) => {
  const actual = await importActual<typeof import("@sico/ui")>();
  return {
    ...actual,
    toast: { error: vi.fn(), success: vi.fn() },
  };
});

function FailureActionsProbe(): ReactElement | null {
  const registry = useSkillSaveRegistry();
  if (registry.status !== "error") {
    return null;
  }
  return (
    <>
      {registry.hasRetryableFailure ? (
        <button type="button" onClick={() => registry.retryAll()}>
          Retry failed upload
        </button>
      ) : null}
      {registry.hasDiscardableFailure ? (
        <button type="button" onClick={registry.discardFailed}>
          Discard failed upload
        </button>
      ) : null}
    </>
  );
}

function renderSection(
  post = vi.fn(),
  agentId?: string,
): ReturnType<typeof vi.fn> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const apiClient = createTestApiClient({ post });

  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider client={apiClient}>
          <SkillSaveRegistryProvider>{children}</SkillSaveRegistryProvider>
        </ApiClientProvider>
      </QueryClientProvider>
    );
  }

  render(
    <>
      <SetupSkillSection agentId={agentId} editable />
      <FailureActionsProbe />
    </>,
    { wrapper: Wrapper },
  );
  return post;
}

async function stageSearchSkill(): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Add skills" }));
  await user.upload(
    screen.getByLabelText("Skill files"),
    new File(["# Search"], "search.md", { type: "text/markdown" }),
  );
  await user.click(screen.getByRole("button", { name: "Upload" }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SetupSkillSection", () => {
  it("enables Add skills in create mode", () => {
    renderSection();

    expect(screen.getByRole("button", { name: "Add skills" })).toBeEnabled();
  });

  it("continues filling forward pages while the sentinel is visible", () => {
    renderSection();

    const options = mockUseInfiniteScrollSentinel.mock.calls[0]?.[2];
    expect(options).toMatchObject({ fillOnComplete: true });
  });

  it("stages selected valid files without calling the API", async () => {
    const post = renderSection();

    await stageSearchSkill();

    expect(screen.getByText("search.md")).toBeVisible();
    expect(post).not.toHaveBeenCalled();
  });

  it("uploads and creates a skill immediately in edit mode", async () => {
    const post = vi
      .fn()
      .mockResolvedValueOnce({ data: makeOkEnvelope({ id: 41 }) })
      .mockResolvedValueOnce({
        data: makeOkEnvelope({
          skill: {
            id: 9,
            agentId: "agent-1",
            name: "Search",
            version: "v1",
            status: 1,
            assetId: 41,
            creatorUsername: "",
            description: "",
            failReason: "",
            projectId: 1,
            createdAt: 1,
            updatedAt: "2",
          },
        }),
      });
    renderSection(post, "agent-1");

    await stageSearchSkill();

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Add skills" }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.queryByText("search.md")).not.toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith("Skills are uploading.");
    expect(post).toHaveBeenNthCalledWith(
      1,
      "/project/asset",
      expect.any(FormData),
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    expect(post).toHaveBeenNthCalledWith(2, "/skills", {
      agentId: "agent-1",
      assetId: 41,
      projectId: undefined,
    });
  });

  it("keeps the dialog locked until immediate upload settles", async () => {
    let resolveAsset: ((value: { data: unknown }) => void) | undefined;
    const assetResponse = new Promise<{ data: unknown }>((resolve) => {
      resolveAsset = resolve;
    });
    const post = vi
      .fn()
      .mockReturnValueOnce(assetResponse)
      .mockResolvedValueOnce({
        data: makeOkEnvelope({
          skill: {
            id: 9,
            agentId: "agent-1",
            name: "Search",
            version: "v1",
            status: 1,
            assetId: 41,
            creatorUsername: "",
            description: "",
            failReason: "",
            projectId: 1,
            createdAt: 1,
            updatedAt: "2",
          },
        }),
      });
    renderSection(post, "agent-1");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Add skills" }));
    await user.upload(
      screen.getByLabelText("Skill files"),
      new File(["# Search"], "search.md", { type: "text/markdown" }),
    );

    await user.click(screen.getByRole("button", { name: "Upload" }));

    expect(screen.getByRole("button", { name: "Uploading…" })).toBeDisabled();
    expect(screen.getByRole("dialog", { name: "Add skills" })).toBeVisible();
    expect(screen.getAllByText("search.md")).toHaveLength(1);
    resolveAsset?.({ data: makeOkEnvelope({ id: 41 }) });
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Add skills" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("offers discard without retry after skill creation fails", async () => {
    const post = vi
      .fn()
      .mockResolvedValueOnce({ data: makeOkEnvelope({ id: 41 }) })
      .mockRejectedValueOnce(new Error("create failed"));
    renderSection(post, "agent-1");
    const user = userEvent.setup();

    await stageSearchSkill();

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Add skills" }),
      ).not.toBeInTheDocument(),
    );
    expect(toast.error).toHaveBeenCalledWith("Some skills couldn't be added.");
    expect(
      screen.queryByRole("button", { name: "Retry failed upload" }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Discard failed upload" }),
    );

    expect(
      screen.queryByRole("button", { name: "Discard failed upload" }),
    ).not.toBeInTheDocument();
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("removes a staged skill draft", async () => {
    renderSection();
    const user = userEvent.setup();

    await stageSearchSkill();
    await user.click(screen.getByRole("button", { name: "Remove skill" }));

    expect(screen.queryByText("search.md")).not.toBeInTheDocument();
  });
});
