import { atom } from "jotai";

import type { StagedSkillDraft } from "../../skill/hooks/use-staged-skill-drafts";

export type StudioSetupHandoff = {
  drafts: StagedSkillDraft[];
  openPublishAfterTransition: boolean;
};

// Raw File objects are intentionally held only for the Create-to-Edit route
// transition. A browser reload creates a fresh store and cannot restore drafts.
export const studioSetupHandoffAtom = atom<Map<string, StudioSetupHandoff>>(
  new Map(),
);
