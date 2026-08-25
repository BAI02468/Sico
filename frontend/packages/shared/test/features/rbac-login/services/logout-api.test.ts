import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { createStore } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { loginAtom, userAtom } from "@/atoms/auth-atom";
import { HTTP_UNAUTHORIZED } from "@/constants/http";
import { logoutApi } from "@/features/rbac-login/services/logout-api";
import { createApiClient } from "@/services/axios";
import { logger } from "@/utils/logger";

import { clearAuthStorage } from "../../../helpers/clear-auth-storage";

describe("logoutApi", () => {
  const instance = axios.create({ baseURL: "/api/sico" });
  let mock: MockAdapter;

  beforeEach(() => {
    clearAuthStorage();
    mock = new MockAdapter(instance);
    vi.spyOn(logger, "warn").mockImplementation(() => {});
  });

  it("resolves to void on OK envelope", async () => {
    mock.onPost("/rbac/logout").reply(200, { code: 0, msg: "ok", data: null });

    await expect(logoutApi(instance, "tok")).resolves.toBeUndefined();
  });

  it("pins the request to the logout owner token", async () => {
    mock.restore();
    const store = createStore();
    store.set(loginAtom, {
      tokenInfo: {
        accessToken: "token-b",
        expiresAt: Math.floor(Date.now() / 1000) + 3_600,
      },
      user: { id: 2, email: "b@b.co", roles: [] },
    });
    const api = createApiClient();
    mock = new MockAdapter(api);
    mock.onPost("/rbac/logout").reply((config) => {
      expect(config.headers?.Authorization).toBe("Bearer token-a");
      return [200, { code: 0, msg: "ok", data: null }];
    });

    await expect(logoutApi(api, "token-a")).resolves.toBeUndefined();
  });

  it("accepts logout HTTP 401 without invoking global unauthorized handling", async () => {
    mock.restore();
    const onUnauthorized = vi.fn();
    const store = createStore();
    const seededUser = { id: 1, email: "a@b.co", roles: [] };
    store.set(loginAtom, {
      tokenInfo: {
        accessToken: "tok",
        expiresAt: Math.floor(Date.now() / 1000) + 3_600,
      },
      user: seededUser,
    });
    const api = createApiClient({ store, onUnauthorized });
    mock = new MockAdapter(api);
    mock.onPost("/rbac/logout").reply(HTTP_UNAUTHORIZED, {
      code: HTTP_UNAUTHORIZED,
      msg: "already logged out",
      data: null,
    });

    await expect(logoutApi(api, "tok")).resolves.toBeUndefined();
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(store.get(userAtom)).toEqual(seededUser);
  });

  it("throws on network failure", async () => {
    mock.onPost("/rbac/logout").networkError();

    await expect(logoutApi(instance, "tok")).rejects.toThrow(
      /network unreachable/,
    );
  });

  it("throws sanitized error on non-OK envelope and logs raw msg", async () => {
    const warnSpy = vi.spyOn(logger, "warn");
    mock
      .onPost("/rbac/logout")
      .reply(200, { code: 500, msg: "internal error", data: null });

    await expect(logoutApi(instance, "tok")).rejects.toThrow(/server rejected/);
    expect(warnSpy).toHaveBeenCalledWith(
      "logoutApi: server rejected",
      expect.objectContaining({ msg: "internal error", code: 500 }),
    );
  });
});
