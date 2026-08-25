export type SaveTarget = {
  id: string;
  save: () => Promise<void>;
};

export type SaveTargetsResult = {
  succeeded: string[];
  failed: string[];
};

export async function runSaveTargets(
  targets: SaveTarget[],
): Promise<SaveTargetsResult> {
  const results = await Promise.allSettled(
    targets.map((target) => target.save()),
  );
  return results.reduce<SaveTargetsResult>(
    (outcome, result, index) => {
      const id = targets[index]?.id;
      if (!id) {
        return outcome;
      }
      outcome[result.status === "fulfilled" ? "succeeded" : "failed"].push(id);
      return outcome;
    },
    { succeeded: [], failed: [] },
  );
}
