import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SkillSaveRegistryProvider } from "@/features/skill/components/setup/skill-save-registry";
import { SkillStatusSchema } from "@/features/skill/schemas/skill";
import { ApiClientProvider } from "@/services/api-client-context";
import { createTestApiClient } from "@/testing/create-test-api-client";

const receivedFileLists: unknown[][] = [];

vi.mock("@/features/skill/components/skill-list/skill-card", () => ({
  SkillCard: ({
    originalFiles,
    onToggle,
  }: {
    originalFiles: unknown[];
    onToggle: () => void;
  }) => {
    receivedFileLists.push(originalFiles);
    return (
      <button type="button" onClick={onToggle}>
        Visual Bot
      </button>
    );
  },
}));

vi.mock("@/features/skill/hooks/use-skill-version-flow", () => ({
  useSkillVersionFlow: () => ({
    detail: { isPending: false },
    parsing: false,
    selectedVersion: "v1",
    selectVersion: vi.fn(),
    startParsingVersion: vi.fn(),
    versions: [],
  }),
}));

vi.mock("@/features/skill/hooks/use-skill-mutations", () => ({
  useDeleteSkillMutation: () => ({ isPending: false, mutate: vi.fn() }),
}));

vi.mock("@/features/skill/hooks/use-skill-card-actions", () => ({
  useSkillCardActions: () => ({
    downloadZip: vi.fn(),
    replaceConfirm: vi.fn(),
    replacing: false,
    save: vi.fn(),
  }),
}));

vi.mock("@/features/skill/hooks/use-zip-files", () => ({
  useZipFiles: () => ({ files: [], isLoading: false, progress: 0 }),
}));

const { SkillCardContainer } =
  await import("@/features/skill/components/skill-card-container");

const skill = {
  id: 1,
  agentId: "a3c0bc10-6d1c-4b33-a866-f3e1b2b91cde",
  name: "Visual Bot",
  description: "",
  version: "v1",
  status: SkillStatusSchema.enum.UPLOADED,
  assetId: 1,
  creatorUsername: "owner@example.com",
  failReason: "",
  projectId: 1,
  createdAt: 1,
  updatedAt: "2",
};

function renderContainer(): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const apiClient = createTestApiClient();
  render(
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={apiClient}>
        <SkillSaveRegistryProvider>
          <SkillCardContainer skill={skill} editable />
        </SkillSaveRegistryProvider>
      </ApiClientProvider>
    </QueryClientProvider>,
  );
}

describe("SkillCardContainer", () => {
  it("keeps the collapsed Skill empty file baseline stable across a toggle", async () => {
    const user = userEvent.setup();
    renderContainer();

    await user.click(screen.getByRole("button", { name: "Visual Bot" }));

    expect(receivedFileLists).toHaveLength(2);
    expect(receivedFileLists[1]).toBe(receivedFileLists[0]);
  });
});
