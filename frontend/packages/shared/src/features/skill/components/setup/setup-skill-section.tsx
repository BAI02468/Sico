import { useLingui } from "@lingui/react/macro";
import { Button, toast } from "@sico/ui";
import {
  type ReactElement,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { SkillBody } from "./skill-body";
import { StagedSkillDraftList } from "./staged-skill-draft-list";
import { useInfiniteScrollSentinel } from "../../../../hooks/use-infinite-scroll-sentinel";
import { SETUP_SKILLS_PAGE_SIZE } from "../../constants";
import { useSkillsInfiniteQuery } from "../../hooks/use-skills-query";
import {
  type SaveDraftBatchResult,
  type StagedSkillDraft,
  useStagedSkillDrafts,
} from "../../hooks/use-staged-skill-drafts";
import { UploadSkillDialog } from "../dialogs/upload-skill-dialog";

function useUploadResultToast(): (result: SaveDraftBatchResult) => void {
  const { t } = useLingui();
  return useCallback(
    (result: SaveDraftBatchResult): void => {
      if (result.failedCount > 0) {
        toast.error(
          t({
            id: "skill.setupSkillSection.uploadFailure",
            message: "Some skills couldn't be added.",
          }),
        );
        return;
      }
      if (result.successCount === 0) {
        return;
      }
      toast.success(
        result.anyUploading
          ? t({
              id: "skill.setupSkillSection.skillsUploading",
              message: "Skills are uploading.",
            })
          : t({
              id: "skill.setupSkillSection.skillsAdded",
              message: "Skills added successfully.",
            }),
      );
    },
    [t],
  );
}

export function SetupSkillSection({
  agentId,
  rootRef,
  editable,
  initialStagedDrafts = [],
  onInitialDraftsConsumed,
}: {
  agentId?: string;
  rootRef?: RefObject<HTMLElement | null>;
  editable: boolean;
  initialStagedDrafts?: StagedSkillDraft[];
  onInitialDraftsConsumed?: () => void;
}): ReactElement {
  const { t } = useLingui();
  const [dialogOpen, setDialogOpen] = useState(false);
  const stagedDrafts = useStagedSkillDrafts(initialStagedDrafts, agentId);
  const showUploadResult = useUploadResultToast();

  useEffect(() => {
    if (initialStagedDrafts.length > 0) {
      onInitialDraftsConsumed?.();
    }
  }, [initialStagedDrafts.length, onInitialDraftsConsumed]);
  const skills = useSkillsInfiniteQuery(
    { agentId: agentId ?? "", pageSize: SETUP_SKILLS_PAGE_SIZE },
    { enabled: Boolean(agentId) },
  );

  const items = useMemo(
    () => skills.data?.pages.flatMap((page) => page.items) ?? [],
    [skills.data],
  );
  const { isFetchingNextPage, hasNextPage, fetchNextPage } = skills;

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useInfiniteScrollSentinel(
    sentinelRef,
    {
      hasNextPage: hasNextPage && !skills.isFetchNextPageError,
      isFetchingNextPage,
      fetchNextPage,
    },
    { rootRef, fillOnComplete: true },
  );

  const handleConfirm = async (files: File[]): Promise<void> => {
    if (!editable) {
      setDialogOpen(false);
      return;
    }
    const draftIds = stagedDrafts.stageFiles(files);
    if (agentId) {
      const result = await stagedDrafts.saveDrafts(draftIds, agentId);
      showUploadResult(result);
    }
    setDialogOpen(false);
  };

  return (
    <section className="flex flex-1 flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-foreground-primary text-base font-medium">
          {t({ id: "skill.setupSkillSection.title", message: "SKILL" })}
        </h2>
        <Button
          variant="secondary"
          size="xs"
          disabled={!editable}
          onClick={() => setDialogOpen(true)}
        >
          {t({
            id: "skill.setupSkillSection.addSkills",
            message: "Add skills",
          })}
        </Button>
      </div>
      <SkillBody
        agentId={agentId}
        pending={skills.isPending}
        editable={editable}
        items={items}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        isFetchNextPageError={skills.isFetchNextPageError}
        sentinelRef={sentinelRef}
        onRetryNextPage={fetchNextPage}
      />
      {!agentId ? (
        <StagedSkillDraftList
          drafts={stagedDrafts.drafts}
          editable={editable}
          onRemove={stagedDrafts.removeDraft}
        />
      ) : null}
      <UploadSkillDialog
        open={dialogOpen}
        mode="create"
        onOpenChange={setDialogOpen}
        onConfirm={handleConfirm}
      />
    </section>
  );
}
