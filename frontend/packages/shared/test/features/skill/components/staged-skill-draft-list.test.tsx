import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StagedSkillDraftList } from "@/features/skill/components/setup/staged-skill-draft-list";

describe("StagedSkillDraftList", () => {
  it("disables draft removal when editing is locked", () => {
    render(
      <StagedSkillDraftList
        editable={false}
        drafts={[
          {
            id: "skill-draft-1",
            file: new File(["# Search"], "search.md"),
            status: "pending",
          },
        ]}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Remove skill" })).toBeDisabled();
  });

  it("retries a failed draft directly", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <StagedSkillDraftList
        drafts={[
          {
            id: "skill-draft-1",
            file: new File(["# Search"], "search.md"),
            status: "failed",
          },
        ]}
        onRemove={vi.fn()}
        onRetry={onRetry}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledWith("skill-draft-1");
  });

  it("labels a successfully saved draft", () => {
    render(
      <StagedSkillDraftList
        drafts={[
          {
            id: "skill-draft-1",
            file: new File(["# Search"], "search.md"),
            status: "saved",
          },
        ]}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText("Saved")).toBeVisible();
  });
});
