import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { SkillBody } from "@/features/skill/components/setup/skill-body";

describe("SkillBody", () => {
  it("keeps the pagination sentinel when a filtered page is empty", () => {
    render(
      <SkillBody
        agentId="agent-1"
        pending={false}
        editable
        items={[]}
        hasNextPage
        isFetchingNextPage={false}
        isFetchNextPageError={false}
        sentinelRef={createRef<HTMLDivElement>()}
        onRetryNextPage={() => undefined}
      />,
    );

    expect(screen.getByTestId("skill-scroll-sentinel")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Empty List" })).toBeNull();
  });

  it("shows the empty state after the final filtered page", () => {
    render(
      <SkillBody
        agentId="agent-1"
        pending={false}
        editable
        items={[]}
        hasNextPage={false}
        isFetchingNextPage={false}
        isFetchNextPageError={false}
        sentinelRef={createRef<HTMLDivElement>()}
        onRetryNextPage={() => undefined}
      />,
    );

    expect(screen.getByRole("heading", { name: "Empty List" })).toBeVisible();
  });

  it("retries a failed next page without hiding loaded content", async () => {
    const user = userEvent.setup();
    const onRetryNextPage = vi.fn();
    render(
      <SkillBody
        agentId="agent-1"
        pending={false}
        editable
        items={[]}
        hasNextPage
        isFetchingNextPage={false}
        isFetchNextPageError
        sentinelRef={createRef<HTMLDivElement>()}
        onRetryNextPage={onRetryNextPage}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Couldn't load more skills.",
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetryNextPage).toHaveBeenCalledOnce();
  });
});
