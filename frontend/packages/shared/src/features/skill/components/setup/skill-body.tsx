import { useLingui } from "@lingui/react/macro";
import { Button, Spinner } from "@sico/ui";
import { type ReactElement, type RefObject } from "react";

import { MessageState } from "../../../../components/message-state";
import { EMPTY_ILLUSTRATIONS } from "../../../../constants/empty-illustration";
import { type SkillItem } from "../../schemas/skill";
import { SkillCardContainer } from "../skill-card-container";

export function SkillBody({
  agentId,
  pending,
  editable,
  items,
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError,
  sentinelRef,
  onRetryNextPage,
}: {
  agentId?: string;
  pending: boolean;
  editable: boolean;
  items: SkillItem[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
  onRetryNextPage: () => void;
}): ReactElement | null {
  const { t } = useLingui();
  if (agentId && pending) {
    return null;
  }
  if (items.length > 0 || hasNextPage) {
    return (
      <div className="flex flex-col gap-4">
        {items.map((skill) => (
          <SkillCardContainer
            key={skill.id}
            skill={skill}
            editable={editable}
          />
        ))}
        <div
          ref={sentinelRef}
          data-testid="skill-scroll-sentinel"
          aria-hidden="true"
        />
        {isFetchingNextPage ? (
          <div className="flex w-full items-center justify-center py-6">
            <Spinner
              aria-label={t({
                id: "skill.setupSkillSection.loadingMore",
                message: "Loading more",
              })}
            />
          </div>
        ) : null}
        {isFetchNextPageError ? (
          <div
            role="alert"
            className="text-foreground-secondary flex items-center justify-center gap-2 p-3 text-sm"
          >
            <span>
              {t({
                id: "skill.setupSkillSection.loadMoreFailed",
                message: "Couldn't load more skills.",
              })}
            </span>
            <Button variant="link" size="xs" onClick={onRetryNextPage}>
              {t({ id: "common.action.tryAgain", message: "Try again" })}
            </Button>
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <MessageState
      fill
      illustrationUrl={EMPTY_ILLUSTRATIONS.skills.url}
      illustrationWidth={EMPTY_ILLUSTRATIONS.skills.width}
      illustrationHeight={EMPTY_ILLUSTRATIONS.skills.height}
      heading={t({
        id: "skill.setupSkillSection.emptyList",
        message: "Empty List",
      })}
      body={t({
        id: "skill.setupSkillSection.noSkillsYet",
        message: "No skills yet.",
      })}
    />
  );
}
