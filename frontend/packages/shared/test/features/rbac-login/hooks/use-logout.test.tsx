import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import axios from "axios";
import { createStore, Provider as JotaiProvider } from "jotai";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import { loginAtom, userAtom } from "@/atoms/auth-atom";
import { useLogout } from "@/features/rbac-login/hooks/use-logout";
import { logoutApi } from "@/features/rbac-login/services/logout-api";
import type { LoginResponse } from "@/schemas/auth";
import { ApiClientProvider } from "@/services/api-client-context";
import { AUTH_TOKEN_LS, getItemFromLocalStorage } from "@/utils/local-storage";
import { logger } from "@/utils/logger";

import { clearAuthStorage } from "../../../helpers/clear-auth-storage";

vi.mock("@/features/rbac-login/services/logout-api", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/rbac-login/services/logout-api")
  >("@/features/rbac-login/services/logout-api");
  return {
    ...actual,
    logoutApi: vi.fn(),
  };
});

const navigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
}));

const mockedLogoutApi = vi.mocked(logoutApi);

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const LOGIN_NAVIGATION = { to: "/login", replace: true } as const;
const HARD_LOGIN_NAVIGATION = {
  to: "/login",
  replace: true,
  reloadDocument: true,
  ignoreBlocker: true,
} as const;
const FALLBACK_LOGIN_NAVIGATION = {
  to: "/login",
  replace: true,
  ignoreBlocker: true,
} as const;
const SESSION_CACHE_KEY = ["notifications"] as const;

function loginPayload(token: string, id: number, email: string): LoginResponse {
  return {
    tokenInfo: {
      accessToken: token,
      expiresAt: Math.floor(Date.now() / 1000) + 3_600,
    },
    user: { id, email, roles: [] },
  };
}

const apiClient = axios.create({ baseURL: "/api/sico" });

function makeWrapper(store: ReturnType<typeof createStore>): {
  Wrapper: (props: { children: ReactNode }) => ReactElement;
  queryClient: QueryClient;
  clearSpy: ReturnType<typeof vi.spyOn>;
} {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  const clearSpy = vi.spyOn(queryClient, "clear");

  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <QueryClientProvider client={queryClient}>
        <JotaiProvider store={store}>
          <ApiClientProvider client={apiClient}>{children}</ApiClientProvider>
        </JotaiProvider>
      </QueryClientProvider>
    );
  }

  return { Wrapper, queryClient, clearSpy };
}

describe("useLogout", () => {
  it("preserves React Query status-discriminated result types", () => {
    type Result = ReturnType<typeof useLogout>;
    type Idle = Extract<Result, { status: "idle" }>;
    type Pending = Extract<Result, { status: "pending" }>;
    type Failed = Extract<Result, { status: "error" }>;
    type Succeeded = Extract<Result, { status: "success" }>;

    expectTypeOf<Idle>().not.toBeNever();
    expectTypeOf<Idle["isIdle"]>().toEqualTypeOf<true>();
    expectTypeOf<Pending>().not.toBeNever();
    expectTypeOf<Pending["isPending"]>().toEqualTypeOf<true>();
    expectTypeOf<Failed>().not.toBeNever();
    expectTypeOf<Failed["error"]>().toEqualTypeOf<Error>();
    expectTypeOf<Succeeded>().not.toBeNever();
    expectTypeOf<Succeeded["isSuccess"]>().toEqualTypeOf<true>();
    expectTypeOf<Succeeded["data"]>().toEqualTypeOf<void>();
  });

  beforeEach(() => {
    mockedLogoutApi.mockReset();
    navigate.mockReset();
    clearAuthStorage();
  });

  it("on success: clears userAtom, clears queryClient, and navigates to /login", async () => {
    mockedLogoutApi.mockResolvedValue(undefined);
    const store = createStore();
    store.set(loginAtom, loginPayload("token-a", 1, "a@b.co"));
    const { Wrapper, clearSpy } = makeWrapper(store);

    const { result } = renderHook(() => useLogout(), { wrapper: Wrapper });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(store.get(userAtom)).toBeNull();
    expect(clearSpy).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith({ to: "/login", replace: true });
    expect(mockedLogoutApi).toHaveBeenCalledWith(apiClient, "token-a");
  });

  it("clears auth before navigation and waits to clear cache until navigation settles", async () => {
    mockedLogoutApi.mockResolvedValue(undefined);
    const navigation = deferred<void>();
    const store = createStore();
    store.set(loginAtom, loginPayload("token-a", 1, "a@b.co"));
    const { Wrapper, clearSpy } = makeWrapper(store);
    let userWhenNavigateCalled = store.get(userAtom);
    navigate.mockImplementation(() => {
      userWhenNavigateCalled = store.get(userAtom);
      return navigation.promise;
    });

    const { result } = renderHook(() => useLogout(), { wrapper: Wrapper });
    result.current.mutate();

    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(userWhenNavigateCalled).toBeNull();
    expect(store.get(userAtom)).toBeNull();
    expect(clearSpy).not.toHaveBeenCalled();

    navigation.resolve();
    await waitFor(() => expect(clearSpy).toHaveBeenCalled());
  });

  it("binds the server request to the token captured at invocation", async () => {
    const serverLogout = deferred<void>();
    mockedLogoutApi.mockReturnValue(serverLogout.promise);
    const store = createStore();
    store.set(loginAtom, loginPayload("token-a", 1, "a@b.co"));
    const { Wrapper } = makeWrapper(store);
    const { result } = renderHook(() => useLogout(), { wrapper: Wrapper });

    const mutation = result.current.mutateAsync();
    store.set(loginAtom, loginPayload("token-b", 2, "b@b.co"));

    await waitFor(() =>
      expect(mockedLogoutApi).toHaveBeenCalledWith(apiClient, "token-a"),
    );
    serverLogout.resolve();
    await mutation;
    expect(getItemFromLocalStorage(AUTH_TOKEN_LS)).toBe("token-b");
    expect(store.get(userAtom)?.email).toBe("b@b.co");
  });

  it("joins concurrent calls to the initiating session A logout", async () => {
    const sessionALogout = deferred<void>();
    mockedLogoutApi.mockReturnValueOnce(sessionALogout.promise);
    const store = createStore();
    store.set(loginAtom, loginPayload("token-a", 1, "a@b.co"));
    const { Wrapper, clearSpy } = makeWrapper(store);
    const { result } = renderHook(() => useLogout(), { wrapper: Wrapper });

    const mutationA = result.current.mutateAsync();
    await waitFor(() =>
      expect(mockedLogoutApi).toHaveBeenCalledWith(apiClient, "token-a"),
    );
    const replacementStore = createStore();
    replacementStore.set(loginAtom, loginPayload("token-b", 2, "b@b.co"));
    const mutationB = result.current.mutateAsync();
    await act(async () => Promise.resolve());

    expect(mockedLogoutApi).toHaveBeenCalledOnce();
    sessionALogout.resolve();
    await Promise.all([mutationA, mutationB]);
    expect(getItemFromLocalStorage(AUTH_TOKEN_LS)).toBe("token-b");
    expect(store.get(userAtom)?.email).toBe("a@b.co");
    expect(clearSpy).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(HARD_LOGIN_NAVIGATION);
  });

  it("does not send a tokenless attempt with a later replacement token", async () => {
    mockedLogoutApi.mockResolvedValue(undefined);
    const store = createStore();
    const { Wrapper } = makeWrapper(store);
    const { result } = renderHook(() => useLogout(), { wrapper: Wrapper });

    const mutation = result.current.mutateAsync();
    store.set(loginAtom, loginPayload("token-b", 2, "b@b.co"));
    await mutation;

    expect(mockedLogoutApi).not.toHaveBeenCalled();
    expect(getItemFromLocalStorage(AUTH_TOKEN_LS)).toBe("token-b");
    expect(store.get(userAtom)?.email).toBe("b@b.co");
  });

  it("reloads replacement session B after retiring session A cache", async () => {
    const serverLogout = deferred<void>();
    mockedLogoutApi.mockReturnValue(serverLogout.promise);
    const store = createStore();
    store.set(loginAtom, loginPayload("token-a", 1, "a@b.co"));
    const { Wrapper, queryClient, clearSpy } = makeWrapper(store);
    queryClient.setQueryData(SESSION_CACHE_KEY, { owner: "a" });
    const { result } = renderHook(() => useLogout(), { wrapper: Wrapper });

    const mutation = result.current.mutateAsync();
    await waitFor(() => expect(mockedLogoutApi).toHaveBeenCalled());
    store.set(loginAtom, loginPayload("token-b", 2, "b@b.co"));
    serverLogout.resolve();
    await mutation;

    expect(getItemFromLocalStorage(AUTH_TOKEN_LS)).toBe("token-b");
    expect(store.get(userAtom)?.email).toBe("b@b.co");
    expect(queryClient.getQueryData(SESSION_CACHE_KEY)).toBeUndefined();
    expect(clearSpy).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(HARD_LOGIN_NAVIGATION);
    expect(clearSpy.mock.invocationCallOrder[0]).toBeLessThan(
      navigate.mock.invocationCallOrder[0]!,
    );
  });

  it("reloads cross-tab session B instead of keeping stale Jotai session A", async () => {
    const serverLogout = deferred<void>();
    mockedLogoutApi.mockReturnValue(serverLogout.promise);
    const store = createStore();
    store.set(loginAtom, loginPayload("token-a", 1, "a@b.co"));
    const { Wrapper, queryClient, clearSpy } = makeWrapper(store);
    queryClient.setQueryData(SESSION_CACHE_KEY, { owner: "a" });
    const { result } = renderHook(() => useLogout(), { wrapper: Wrapper });

    const mutation = result.current.mutateAsync();
    await waitFor(() => expect(mockedLogoutApi).toHaveBeenCalled());
    const replacementStore = createStore();
    replacementStore.set(loginAtom, loginPayload("token-b", 2, "b@b.co"));
    serverLogout.resolve();
    await mutation;

    expect(getItemFromLocalStorage(AUTH_TOKEN_LS)).toBe("token-b");
    expect(store.get(userAtom)?.email).toBe("a@b.co");
    expect(createStore().get(userAtom)?.email).toBe("b@b.co");
    expect(queryClient.getQueryData(SESSION_CACHE_KEY)).toBeUndefined();
    expect(clearSpy).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(HARD_LOGIN_NAVIGATION);
  });

  it("reloads session B after it appears during session A navigation", async () => {
    mockedLogoutApi.mockResolvedValue(undefined);
    const navigation = deferred<void>();
    navigate
      .mockReturnValueOnce(navigation.promise)
      .mockResolvedValueOnce(undefined);
    const store = createStore();
    store.set(loginAtom, loginPayload("token-a", 1, "a@b.co"));
    const { Wrapper, queryClient, clearSpy } = makeWrapper(store);
    queryClient.setQueryData(SESSION_CACHE_KEY, { owner: "a" });
    const { result } = renderHook(() => useLogout(), { wrapper: Wrapper });

    const mutation = result.current.mutateAsync();
    await waitFor(() => expect(navigate).toHaveBeenCalledOnce());
    expect(navigate).toHaveBeenNthCalledWith(1, LOGIN_NAVIGATION);
    expect(store.get(userAtom)).toBeNull();
    expect(clearSpy).not.toHaveBeenCalled();

    store.set(loginAtom, loginPayload("token-b", 2, "b@b.co"));
    navigation.resolve();
    await mutation;

    expect(getItemFromLocalStorage(AUTH_TOKEN_LS)).toBe("token-b");
    expect(store.get(userAtom)?.email).toBe("b@b.co");
    expect(queryClient.getQueryData(SESSION_CACHE_KEY)).toBeUndefined();
    expect(clearSpy).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenNthCalledWith(2, HARD_LOGIN_NAVIGATION);
  });

  it("clears stale Jotai identity when session A storage becomes empty", async () => {
    const serverLogout = deferred<void>();
    mockedLogoutApi.mockReturnValue(serverLogout.promise);
    const store = createStore();
    store.set(loginAtom, loginPayload("token-a", 1, "a@b.co"));
    const { Wrapper, clearSpy } = makeWrapper(store);
    const { result } = renderHook(() => useLogout(), { wrapper: Wrapper });

    const mutation = result.current.mutateAsync();
    await waitFor(() => expect(mockedLogoutApi).toHaveBeenCalled());
    clearAuthStorage();
    expect(store.get(userAtom)?.email).toBe("a@b.co");
    serverLogout.resolve();
    await mutation;

    expect(store.get(userAtom)).toBeNull();
    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(LOGIN_NAVIGATION);
    expect(clearSpy).toHaveBeenCalledOnce();
  });

  it("reloads session B even when session A navigation rejects", async () => {
    mockedLogoutApi.mockResolvedValue(undefined);
    const navigation = deferred<void>();
    navigate
      .mockReturnValueOnce(navigation.promise)
      .mockResolvedValueOnce(undefined);
    const navigationError = new Error("navigation failed");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const store = createStore();
    store.set(loginAtom, loginPayload("token-a", 1, "a@b.co"));
    const { Wrapper, queryClient, clearSpy } = makeWrapper(store);
    queryClient.setQueryData(SESSION_CACHE_KEY, { owner: "a" });
    const { result } = renderHook(() => useLogout(), { wrapper: Wrapper });

    const mutation = result.current.mutateAsync();
    await waitFor(() => expect(navigate).toHaveBeenCalledOnce());
    store.set(loginAtom, loginPayload("token-b", 2, "b@b.co"));
    navigation.reject(navigationError);
    await expect(mutation).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith(
      "useLogout: navigation failed",
      navigationError,
    );
    expect(getItemFromLocalStorage(AUTH_TOKEN_LS)).toBe("token-b");
    expect(queryClient.getQueryData(SESSION_CACHE_KEY)).toBeUndefined();
    expect(clearSpy).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenNthCalledWith(2, HARD_LOGIN_NAVIGATION);
  });

  it("clears session A when its token reappears during navigation", async () => {
    mockedLogoutApi.mockResolvedValue(undefined);
    const navigation = deferred<void>();
    navigate.mockReturnValueOnce(navigation.promise);
    const store = createStore();
    store.set(loginAtom, loginPayload("token-a", 1, "a@b.co"));
    const { Wrapper, clearSpy } = makeWrapper(store);
    const { result } = renderHook(() => useLogout(), { wrapper: Wrapper });

    const mutation = result.current.mutateAsync();
    await waitFor(() => expect(navigate).toHaveBeenCalledOnce());
    expect(store.get(userAtom)).toBeNull();
    store.set(loginAtom, loginPayload("token-a", 1, "a@b.co"));
    navigation.resolve();
    await mutation;

    expect(getItemFromLocalStorage(AUTH_TOKEN_LS)).toBeNull();
    expect(store.get(userAtom)).toBeNull();
    expect(clearSpy).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledOnce();
  });

  it("fails closed when cross-tab session B hard navigation rejects", async () => {
    const serverLogout = deferred<void>();
    mockedLogoutApi.mockReturnValue(serverLogout.promise);
    const navigationError = new Error("reload failed");
    navigate
      .mockRejectedValueOnce(navigationError)
      .mockResolvedValueOnce(undefined);
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const store = createStore();
    store.set(loginAtom, loginPayload("token-a", 1, "a@b.co"));
    const { Wrapper, clearSpy } = makeWrapper(store);
    const { result } = renderHook(() => useLogout(), { wrapper: Wrapper });

    const mutation = result.current.mutateAsync();
    await waitFor(() => expect(mockedLogoutApi).toHaveBeenCalled());
    const replacementStore = createStore();
    replacementStore.set(loginAtom, loginPayload("token-b", 2, "b@b.co"));
    expect(store.get(userAtom)?.email).toBe("a@b.co");
    expect(getItemFromLocalStorage(AUTH_TOKEN_LS)).toBe("token-b");
    serverLogout.resolve();
    await expect(mutation).resolves.toBeUndefined();

    expect(store.get(userAtom)).toBeNull();
    expect(getItemFromLocalStorage(AUTH_TOKEN_LS)).toBeNull();
    expect(clearSpy).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenNthCalledWith(1, HARD_LOGIN_NAVIGATION);
    expect(navigate).toHaveBeenNthCalledWith(2, FALLBACK_LOGIN_NAVIGATION);
    expect(errorSpy).toHaveBeenCalledWith(
      "useLogout: navigation failed",
      navigationError,
    );
  });

  it("fails closed when session B appears before a rejected hard recovery", async () => {
    mockedLogoutApi.mockResolvedValue(undefined);
    const initialNavigation = deferred<void>();
    const navigationError = new Error("reload failed");
    navigate
      .mockReturnValueOnce(initialNavigation.promise)
      .mockRejectedValueOnce(navigationError)
      .mockResolvedValueOnce(undefined);
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const store = createStore();
    store.set(loginAtom, loginPayload("token-a", 1, "a@b.co"));
    const { Wrapper, queryClient, clearSpy } = makeWrapper(store);
    queryClient.setQueryData(SESSION_CACHE_KEY, { owner: "a" });
    const { result } = renderHook(() => useLogout(), { wrapper: Wrapper });

    const mutation = result.current.mutateAsync();
    await waitFor(() => expect(navigate).toHaveBeenCalledOnce());
    expect(store.get(userAtom)).toBeNull();
    const replacementStore = createStore();
    replacementStore.set(loginAtom, loginPayload("token-b", 2, "b@b.co"));
    initialNavigation.resolve();
    await expect(mutation).resolves.toBeUndefined();

    expect(store.get(userAtom)).toBeNull();
    expect(getItemFromLocalStorage(AUTH_TOKEN_LS)).toBeNull();
    expect(queryClient.getQueryData(SESSION_CACHE_KEY)).toBeUndefined();
    expect(clearSpy).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledTimes(3);
    expect(navigate).toHaveBeenNthCalledWith(1, LOGIN_NAVIGATION);
    expect(navigate).toHaveBeenNthCalledWith(2, HARD_LOGIN_NAVIGATION);
    expect(navigate).toHaveBeenNthCalledWith(3, FALLBACK_LOGIN_NAVIGATION);
    expect(errorSpy).toHaveBeenCalledWith(
      "useLogout: navigation failed",
      navigationError,
    );
  });

  it("settles once and logs when login navigation fails", async () => {
    mockedLogoutApi.mockResolvedValue(undefined);
    const navigationError = new Error("navigation failed");
    navigate.mockRejectedValueOnce(navigationError);
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const store = createStore();
    store.set(loginAtom, loginPayload("token-a", 1, "a@b.co"));
    const { Wrapper, clearSpy } = makeWrapper(store);
    const { result } = renderHook(() => useLogout(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(store.get(userAtom)).toBeNull();
    expect(navigate).toHaveBeenCalledOnce();
    expect(clearSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith(
      "useLogout: navigation failed",
      navigationError,
    );
  });

  it("on server failure: still clears userAtom, clears queryClient, navigates, and surfaces error", async () => {
    mockedLogoutApi.mockRejectedValue(new Error("network unreachable"));
    const store = createStore();
    store.set(loginAtom, loginPayload("token-a", 1, "a@b.co"));
    const { Wrapper, clearSpy } = makeWrapper(store);

    const { result } = renderHook(() => useLogout(), { wrapper: Wrapper });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(store.get(userAtom)).toBeNull();
    expect(clearSpy).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith({ to: "/login", replace: true });
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
