// @vitest-environment node
import type { ProxyOptions, UserConfig, UserConfigFnObject } from "vite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `defineConfig` returns object or thunk — narrow by calling the
// function form with a typed `ConfigEnv`.
async function resolveConfig(): Promise<UserConfig> {
  // Re-import so each test observes the current `process.env` —
  // vite.config reads `VITE_API_TARGET` at module evaluation time.
  vi.resetModules();
  const mod = await import("../../vite.config");
  const config = mod.default as UserConfig | UserConfigFnObject;
  if (typeof config === "function") {
    return config({ command: "serve", mode: "development" });
  }
  return config;
}

function readProxyEntry(cfg: UserConfig, route: string): ProxyOptions {
  const entry = cfg.server?.proxy?.[route];
  expect(entry).toBeDefined();
  if (typeof entry !== "object") {
    throw new Error(
      `Expected ${route} proxy entry to be a ProxyOptions object`,
    );
  }
  return entry;
}

function readProxyTarget(cfg: UserConfig, route: string): string {
  const entry = readProxyEntry(cfg, route);
  expect(entry.changeOrigin).toBe(true);
  return entry.target as string;
}

describe("vite dev proxy", () => {
  const savedTarget = process.env.VITE_API_TARGET;

  beforeEach(() => {
    delete process.env.VITE_API_TARGET;
  });

  afterEach(() => {
    if (savedTarget === undefined) {
      delete process.env.VITE_API_TARGET;
    } else {
      process.env.VITE_API_TARGET = savedTarget;
    }
  });

  it("routes /api/sico to localhost:8080 by default (microsoft/sico nginx)", async () => {
    const cfg = await resolveConfig();
    expect(readProxyTarget(cfg, "/api/sico")).toBe("http://localhost:8080");
  });

  it("routes /storage to the same target — sico backend rewrites object URLs to /storage/* via sub_filter", async () => {
    const cfg = await resolveConfig();
    expect(readProxyTarget(cfg, "/storage")).toBe("http://localhost:8080");
  });

  it("honours VITE_API_TARGET env override for both routes", async () => {
    process.env.VITE_API_TARGET = "http://localhost:8137";
    const cfg = await resolveConfig();
    expect(readProxyTarget(cfg, "/api/sico")).toBe("http://localhost:8137");
    expect(readProxyTarget(cfg, "/storage")).toBe("http://localhost:8137");
  });
});
