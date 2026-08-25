import { useSetAtom } from "jotai";
import { useLayoutEffect } from "react";

import { useSidebarCollapseOnSidepane } from "./use-sidebar-collapse-on-sidepane";
import { activeConversationIdAtom } from "../atoms/chat-atom";
import {
  sidepaneContentAtom,
  sidepaneMaximizedAtom,
} from "../atoms/sidepane-atom";

export function useDigitalWorkerHomeLifecycle(agentInstanceId: number): void {
  const setActiveConversationId = useSetAtom(activeConversationIdAtom);
  const setSidepaneContent = useSetAtom(sidepaneContentAtom);
  const setSidepaneMaximized = useSetAtom(sidepaneMaximizedAtom);

  useSidebarCollapseOnSidepane();

  // The home belongs to no conversation. Clear before paint so stale streaming
  // state from a previously opened chat cannot flash a Stop control here.
  useLayoutEffect(() => {
    setActiveConversationId(null);
  }, [setActiveConversationId]);

  // Sidepane state is app-wide; reset it on every agent switch before paint so
  // one worker's preview cannot remain attached to another worker's home.
  useLayoutEffect(() => {
    setSidepaneContent(null);
    setSidepaneMaximized(false);
  }, [agentInstanceId, setSidepaneContent, setSidepaneMaximized]);
}
