import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pending = new Promise<never>(() => {});
let bodyError: Error | null = null;
vi.mock("@/features/studio/components/agent-setup-body", () => ({
  AgentSetupBody: () => {
    if (bodyError) {
      throw bodyError;
    }
    // oxlint-disable-next-line typescript-eslint/only-throw-error -- Suspense catches a pending thenable
    throw pending;
  },
}));

const { AgentSetupPage } =
  await import("@/features/studio/components/agent-setup-page");

function renderPage(): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AgentSetupPage agentId="agent-1" />
    </QueryClientProvider>,
  );
}

describe("<AgentSetupPage>", () => {
  beforeEach(() => {
    bodyError = null;
  });

  it("shows the edit setup skeleton while its data is pending", async () => {
    renderPage();

    expect(
      await screen.findByRole("status", {
        name: "Loading digital worker setup",
      }),
    ).toBeVisible();
    expect(screen.queryByRole("status", { name: "Loading Studio" })).toBeNull();
  });

  it("shows the error fallback when setup permissions fail", async () => {
    bodyError = new Error("permission failed");
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong",
    );
  });
});
