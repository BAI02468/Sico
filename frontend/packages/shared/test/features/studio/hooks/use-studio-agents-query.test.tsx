import axios from "axios";
import { describe, expect, it } from "vitest";

import {
  STUDIO_AGENTS_QUERY_KEY_PREFIX,
  studioAgentsQueryOptions,
} from "@/features/studio/hooks/use-studio-agents-query";
import { type StudioAgentsScope } from "@/features/studio/services/single-agents";

describe("studioAgentsQueryOptions", () => {
  it("uses an explicit platform cache scope", () => {
    const apiClient = axios.create();
    const scope: StudioAgentsScope = { type: "platform" };

    expect(studioAgentsQueryOptions(apiClient, scope).queryKey).toEqual([
      STUDIO_AGENTS_QUERY_KEY_PREFIX,
      "platform",
      "0,1",
      0,
    ]);
  });

  it("separates cached lists by organization and fixed server filters", () => {
    const apiClient = axios.create();

    expect(
      studioAgentsQueryOptions(apiClient, {
        type: "organization",
        organizationId: 1,
      }).queryKey,
    ).toEqual([STUDIO_AGENTS_QUERY_KEY_PREFIX, "organization", 1, "0,1", 0]);
    expect(
      studioAgentsQueryOptions(apiClient, {
        type: "organization",
        organizationId: 2,
      }).queryKey,
    ).toEqual([STUDIO_AGENTS_QUERY_KEY_PREFIX, "organization", 2, "0,1", 0]);
  });

  it("keeps a tab list fresh long enough to reuse its organization cache", () => {
    const apiClient = axios.create();

    expect(
      studioAgentsQueryOptions(apiClient, {
        type: "organization",
        organizationId: 1,
      }).staleTime,
    ).toBe(30_000);
  });
});
