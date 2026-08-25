import { useLingui } from "@lingui/react/macro";
import { toast } from "@sico/ui";
import type { ReactElement } from "react";

import { useDeleteSkillMutation } from "../hooks/use-skill-mutations";
import { type SkillItem } from "../schemas/skill";
import { DeleteSkillDialog } from "./dialogs/delete-skill-dialog";

export function SkillCardDeleteDialog({
  open,
  onOpenChange,
  skill,
  deleteSkill,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill: SkillItem;
  deleteSkill: ReturnType<typeof useDeleteSkillMutation>;
}): ReactElement {
  const { t } = useLingui();
  return (
    <DeleteSkillDialog
      open={open}
      skillName={skill.name}
      pending={deleteSkill.isPending}
      onOpenChange={onOpenChange}
      onConfirm={() =>
        deleteSkill.mutate(skill.id, {
          onSuccess: () => {
            toast.success(
              t({
                id: "skill.cardContainer.skillDeleted",
                message: "Skill deleted",
              }),
              { invert: true },
            );
            onOpenChange(false);
          },
          onError: () =>
            toast.error(
              t({
                id: "skill.cardContainer.deleteFailed",
                message: "Failed to delete skill",
              }),
            ),
        })
      }
    />
  );
}
