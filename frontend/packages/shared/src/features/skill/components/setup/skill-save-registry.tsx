import {
  createContext,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  aggregateSaveQueueStatus,
  type SaveQueueStatus,
} from "../../../../hooks/use-latest-save-queue";
import type { StagedSkillDraft } from "../../hooks/use-staged-skill-drafts";

export type SkillSaveTarget = {
  id: string;
  dirty: boolean;
  status?: SaveQueueStatus;
  save: (agentId: string) => Promise<void>;
  flush?: () => Promise<boolean>;
  retry?: () => Promise<boolean>;
  discard?: () => void;
  handoffDraft?: () => StagedSkillDraft | undefined;
};

type SkillSaveRegistry = {
  targets: SkillSaveTarget[];
  dirtyTargets: SkillSaveTarget[];
  hasUnsettled: boolean;
  status: SaveQueueStatus;
  flushAll: () => Promise<boolean>;
  retryAll: () => Promise<boolean>;
  hasRetryableFailure: boolean;
  hasDiscardableFailure: boolean;
  discardFailed: () => void;
  register: (target: SkillSaveTarget) => () => void;
};

const SkillSaveRegistryContext = createContext<SkillSaveRegistry | null>(null);

function targetUnsettled(target: SkillSaveTarget): boolean {
  return (
    target.dirty ||
    target.status === "saving" ||
    target.status === "scheduled" ||
    target.status === "error" ||
    target.status === "conflict"
  );
}

async function runTarget(
  target: SkillSaveTarget,
  action: "flush" | "retry",
): Promise<boolean> {
  const run = target[action] ?? target.flush;
  if (!run) {
    return !target.dirty;
  }
  try {
    return await run();
  } catch {
    return false;
  }
}

async function drainTargets(
  targetsRef: RefObject<Map<string, SkillSaveTarget>>,
  action: "flush" | "retry",
  processed = new Set<SkillSaveTarget>(),
): Promise<boolean> {
  const targets = [...targetsRef.current.values()].filter(
    (target) => targetUnsettled(target) && !processed.has(target),
  );
  if (targets.length === 0) {
    return true;
  }
  for (const target of targets) {
    processed.add(target);
  }
  const results = await Promise.allSettled(
    targets.map((target) => runTarget(target, action)),
  );
  if (
    results.some(
      (result) => result.status === "rejected" || result.value === false,
    )
  ) {
    return false;
  }
  await Promise.resolve();
  return drainTargets(targetsRef, action, processed);
}

export function SkillSaveRegistryProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const targetsRef = useRef(new Map<string, SkillSaveTarget>());
  const [targets, setTargets] = useState(targetsRef.current);
  const register = useCallback((target: SkillSaveTarget): (() => void) => {
    const next = new Map(targetsRef.current).set(target.id, target);
    targetsRef.current = next;
    setTargets(next);
    return () => {
      if (targetsRef.current.get(target.id) !== target) {
        return;
      }
      const remaining = new Map(targetsRef.current);
      remaining.delete(target.id);
      targetsRef.current = remaining;
      setTargets(remaining);
    };
  }, []);
  const allTargets = useMemo(() => [...targets.values()], [targets]);
  const flushAll = useCallback(() => drainTargets(targetsRef, "flush"), []);
  const retryAll = useCallback(() => drainTargets(targetsRef, "retry"), []);
  const discardFailed = useCallback((): void => {
    for (const target of targetsRef.current.values()) {
      if (target.status === "error") {
        target.discard?.();
      }
    }
  }, []);
  const value = useMemo<SkillSaveRegistry>(
    () => ({
      targets: allTargets,
      dirtyTargets: allTargets.filter((target) => target.dirty),
      hasUnsettled: allTargets.some(targetUnsettled),
      status: aggregateSaveQueueStatus(
        allTargets.map((target) => target.status),
      ),
      flushAll,
      retryAll,
      hasRetryableFailure: allTargets.some(
        (target) =>
          target.status === "error" &&
          (target.retry !== undefined || target.flush !== undefined),
      ),
      hasDiscardableFailure: allTargets.some(
        (target) => target.status === "error" && target.discard !== undefined,
      ),
      discardFailed,
      register,
    }),
    [allTargets, discardFailed, flushAll, register, retryAll],
  );

  return (
    <SkillSaveRegistryContext.Provider value={value}>
      {children}
    </SkillSaveRegistryContext.Provider>
  );
}

export function useSkillSaveRegistry(): SkillSaveRegistry {
  const registry = useContext(SkillSaveRegistryContext);
  if (!registry) {
    throw new Error("SkillSaveRegistryProvider is required");
  }
  return registry;
}
