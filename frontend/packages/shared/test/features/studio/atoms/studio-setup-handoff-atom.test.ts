import { createStore } from "jotai";
import { describe, expect, it } from "vitest";

import {
  type StudioSetupHandoff,
  studioSetupHandoffAtom,
} from "@/features/studio/atoms/studio-setup-handoff-atom";

describe("studioSetupHandoffAtom", () => {
  it("keeps failed drafts scoped to the created agent", () => {
    const store = createStore();
    const handoff: StudioSetupHandoff = {
      drafts: [
        {
          id: "skill-1",
          file: new File(["skill"], "research.md"),
          status: "failed",
        },
      ],
      openPublishAfterTransition: true,
    };

    store.set(studioSetupHandoffAtom, new Map([["agent-1", handoff]]));

    expect(store.get(studioSetupHandoffAtom).get("agent-1")).toBe(handoff);
    expect(store.get(studioSetupHandoffAtom).get("agent-2")).toBeUndefined();
  });

  it("does not persist raw File drafts to a fresh Jotai store", () => {
    const currentStore = createStore();
    currentStore.set(
      studioSetupHandoffAtom,
      new Map([
        [
          "agent-1",
          {
            drafts: [
              {
                id: "skill-1",
                file: new File(["skill"], "research.md"),
                status: "failed",
              },
            ],
            openPublishAfterTransition: false,
          },
        ],
      ]),
    );

    expect(createStore().get(studioSetupHandoffAtom)).toEqual(new Map());
  });
});
