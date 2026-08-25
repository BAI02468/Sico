import { describe, expect, it } from "vitest";

import {
  createQueryClient,
  QUERY_RETRY_BASE_MS,
  QUERY_RETRY_COUNT,
  QUERY_RETRY_MAX_MS,
} from "@/services/query-client";

describe("queryClient", () => {
  it("does not gate queries or mutations on browser online heuristics", () => {
    const qc = createQueryClient();

    expect(qc.getDefaultOptions().queries?.networkMode).toBe("always");
    expect(qc.getDefaultOptions().queries?.refetchOnReconnect).toBe(true);
    expect(qc.getDefaultOptions().mutations?.networkMode).toBe("always");
  });

  it("uses QUERY_RETRY_COUNT for retry", () => {
    const qc = createQueryClient();
    expect(qc.getDefaultOptions().queries?.retry).toBe(QUERY_RETRY_COUNT);
  });

  it("has exponential backoff retryDelay capped at QUERY_RETRY_MAX_MS", () => {
    const qc = createQueryClient();
    const retryDelay = qc.getDefaultOptions().queries?.retryDelay;
    expect(typeof retryDelay).toBe("function");
    if (typeof retryDelay === "function") {
      // Assertions reference the exported constants so the test stays
      // in lock-step if the policy is ever retuned. Behaviour:
      // i=0 → BASE, i=1 → 2*BASE, i=2 → 4*BASE, … eventually capped at MAX.
      expect(retryDelay(0, new Error("test"))).toBe(QUERY_RETRY_BASE_MS);
      expect(retryDelay(1, new Error("test"))).toBe(QUERY_RETRY_BASE_MS * 2);
      expect(retryDelay(10, new Error("test"))).toBe(QUERY_RETRY_MAX_MS);
    }
  });
});
