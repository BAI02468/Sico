// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function readWebServer(): Promise<{
  port?: number;
  reuseExistingServer?: boolean;
}> {
  vi.resetModules();
  const { default: config } = await import("../../playwright.config");
  const webServer = config.webServer;
  expect(webServer).toBeDefined();
  if (webServer === undefined || Array.isArray(webServer)) {
    throw new Error("Expected one local Playwright web server");
  }
  return webServer;
}

describe("Playwright local preview server", () => {
  const savedCi = process.env.CI;
  const savedProxyTarget = process.env.E2E_PREVIEW_PROXY_TARGET;

  beforeEach(() => {
    delete process.env.CI;
    process.env.E2E_PREVIEW_PROXY_TARGET = "http://localhost:8080";
  });

  afterEach(() => {
    if (savedCi === undefined) {
      delete process.env.CI;
    } else {
      process.env.CI = savedCi;
    }
    if (savedProxyTarget === undefined) {
      delete process.env.E2E_PREVIEW_PROXY_TARGET;
    } else {
      process.env.E2E_PREVIEW_PROXY_TARGET = savedProxyTarget;
    }
  });

  it("refuses to reuse a preview server from another worktree", async () => {
    const webServer = await readWebServer();

    expect(webServer.port).toBe(4173);
    expect(webServer.reuseExistingServer).toBe(false);
  });
});
