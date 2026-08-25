import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useReducer } from "react";

import type { StagedSkillDraft } from "../../skill/hooks/use-staged-skill-drafts";
import { studioSetupHandoffAtom } from "../atoms/studio-setup-handoff-atom";

function useStudioHandoff(agentId: string): {
  drafts: StagedSkillDraft[];
  consume: () => void;
  onDraftsConsumed: () => void;
  shouldOpenPublish: boolean;
} {
  const handoff = useAtomValue(studioSetupHandoffAtom).get(agentId);
  const setHandoffs = useSetAtom(studioSetupHandoffAtom);
  const consume = useCallback(() => {
    setHandoffs((current) => {
      if (!current.has(agentId)) {
        return current;
      }
      const next = new Map(current);
      next.delete(agentId);
      return next;
    });
  }, [agentId, setHandoffs]);
  const onDraftsConsumed = useCallback(() => {
    setHandoffs((current) => {
      const currentHandoff = current.get(agentId);
      if (!currentHandoff) {
        return current;
      }
      const next = new Map(current);
      if (currentHandoff.openPublishAfterTransition) {
        next.set(agentId, { ...currentHandoff, drafts: [] });
      } else {
        next.delete(agentId);
      }
      return next;
    });
  }, [agentId, setHandoffs]);
  return {
    drafts: handoff?.drafts ?? [],
    consume,
    onDraftsConsumed,
    shouldOpenPublish: handoff?.openPublishAfterTransition === true,
  };
}

type PublishDialogState = {
  openedHandoffAgentId: string | null;
  publishOpen: boolean;
};

type PublishDialogAction =
  | { type: "open-handoff"; agentId: string }
  | { type: "set-open"; open: boolean };

function reducePublishDialogState(
  state: PublishDialogState,
  action: PublishDialogAction,
): PublishDialogState {
  if (action.type === "open-handoff") {
    return { ...state, openedHandoffAgentId: action.agentId };
  }
  return {
    publishOpen: action.open,
    openedHandoffAgentId: action.open ? state.openedHandoffAgentId : null,
  };
}

export function useStudioPublishHandoff({
  agentId,
  canPublish,
  isPermissionError,
  isPermissionLoading,
}: {
  agentId: string;
  canPublish: boolean;
  isPermissionError: boolean;
  isPermissionLoading: boolean;
}): {
  drafts: StagedSkillDraft[];
  onDraftsConsumed: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
} {
  const { drafts, consume, onDraftsConsumed, shouldOpenPublish } =
    useStudioHandoff(agentId);
  const [state, dispatch] = useReducer(reducePublishDialogState, {
    openedHandoffAgentId: null,
    publishOpen: false,
  });
  const openedFromHandoff = state.openedHandoffAgentId === agentId;
  const canOpenHandoff =
    shouldOpenPublish &&
    canPublish &&
    !isPermissionLoading &&
    !isPermissionError;

  useEffect(() => {
    if (canOpenHandoff && !openedFromHandoff) {
      dispatch({ type: "open-handoff", agentId });
    }
  }, [agentId, canOpenHandoff, openedFromHandoff]);

  useEffect(() => {
    if (openedFromHandoff) {
      consume();
    }
  }, [consume, openedFromHandoff]);

  return {
    drafts,
    onDraftsConsumed,
    open: state.publishOpen || openedFromHandoff,
    onOpenChange: (open) => dispatch({ type: "set-open", open }),
  };
}
