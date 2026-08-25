import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { SKILL_DETAIL_QUERY_KEY_PREFIX } from "./use-skill-detail-query";
import { useSkillStatusQuery } from "./use-skill-status-query";
import {
  type SkillItem,
  type SkillStatus,
  SkillStatusSchema,
} from "../schemas/skill";

// Maps a poll outcome onto a terminal status, or undefined if still pending.
// Exhausted polling (stuck past the attempt cap) counts as FAILED so the caller
// can leave its "Parsing …" state instead of hanging on a never-terminal status.
function resolveSettledStatus(
  status: SkillStatus | undefined,
  isExhausted: boolean,
): SkillStatus | undefined {
  if (
    status === SkillStatusSchema.enum.UPLOADED ||
    status === SkillStatusSchema.enum.FAILED
  ) {
    return status;
  }
  return isExhausted ? SkillStatusSchema.enum.FAILED : undefined;
}

// Polls /skills/status while a skill is parsing and, on a terminal status,
// invalidates the skill's detail cache (so the new version's data lands) and
// reports the terminal status. Save and replace mutations refresh the list,
// detail, and status caches; this polling hook only needs to refresh detail.
export function useSkillStatusSync({
  skill,
  version,
  parsing,
  onSettled,
}: {
  skill: SkillItem;
  version: string;
  parsing: boolean;
  onSettled: (status: SkillStatus) => void;
}): void {
  const queryClient = useQueryClient();
  const { data: status, isExhausted } = useSkillStatusQuery({
    id: skill.id,
    version,
    enabled: parsing,
  });

  useEffect(() => {
    if (!parsing) {
      return;
    }
    const settled = resolveSettledStatus(status, isExhausted);
    if (settled === undefined) {
      return;
    }
    void queryClient.invalidateQueries({
      queryKey: [SKILL_DETAIL_QUERY_KEY_PREFIX, skill.id],
    });
    onSettled(settled);
  }, [status, isExhausted, parsing, skill.id, queryClient, onSettled]);
}
