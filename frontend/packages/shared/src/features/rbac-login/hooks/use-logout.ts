// Orchestrates server logout → client cleanup → navigate. Server failure
// is non-blocking: client cleanup + navigate still run via `onSettled`.
import {
  useMutation,
  type UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useSetAtom } from "jotai";
import { useRef } from "react";

import { logoutAtom } from "../../../atoms/auth-atom";
import { useApiClient } from "../../../services/api-client-context";
import {
  AUTH_TOKEN_LS,
  getItemFromLocalStorage,
} from "../../../utils/local-storage";
import { logger } from "../../../utils/logger";
import { logoutApi } from "../services/logout-api";

type LogoutAttempt = Readonly<{ ownerToken: string | null }>;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

type LogoutControls = Readonly<{
  mutate: () => void;
  mutateAsync: () => Promise<void>;
}>;

type UseLogoutResult = DistributiveOmit<
  UseMutationResult<void, Error, LogoutAttempt>,
  "mutate" | "mutateAsync" | "variables"
> &
  LogoutControls;

function readStoredToken(): string | null {
  const token = getItemFromLocalStorage(AUTH_TOKEN_LS);
  return token === "" ? null : token;
}

function isReplacementSession(
  attempt: LogoutAttempt,
  currentToken: string | null,
): boolean {
  return currentToken !== null && currentToken !== attempt.ownerToken;
}

type Navigate = ReturnType<typeof useNavigate>;
type LoginNavigationMode = "normal" | "hard" | "fallback";

async function navigateToLogin(
  navigate: Navigate,
  mode: LoginNavigationMode,
): Promise<boolean> {
  try {
    if (mode === "hard") {
      await navigate({
        to: "/login",
        replace: true,
        reloadDocument: true,
        ignoreBlocker: true,
      });
    } else if (mode === "fallback") {
      await navigate({ to: "/login", replace: true, ignoreBlocker: true });
    } else {
      await navigate({ to: "/login", replace: true });
    }
    return true;
  } catch (error) {
    logger.error("useLogout: navigation failed", error);
    return false;
  }
}

async function recoverReplacementSession(
  navigate: Navigate,
  logout: () => void,
): Promise<void> {
  const recovered = await navigateToLogin(navigate, "hard");
  if (!recovered) {
    logout();
    await navigateToLogin(navigate, "fallback");
  }
}

function useSingleFlightLogout(
  mutation: UseMutationResult<void, Error, LogoutAttempt>,
): LogoutControls {
  const activeLogout = useRef<Promise<void> | null>(null);

  const startLogout = (): Promise<void> => {
    if (activeLogout.current) {
      return activeLogout.current;
    }
    const pending = mutation.mutateAsync({ ownerToken: readStoredToken() });
    activeLogout.current = pending;
    const clearActive = (): void => {
      if (activeLogout.current === pending) {
        activeLogout.current = null;
      }
    };
    void pending.then(clearActive, clearActive);
    return pending;
  };

  return {
    mutate: () => {
      void startLogout();
    },
    mutateAsync: startLogout,
  };
}

export function useLogout(): UseLogoutResult {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const logout = useSetAtom(logoutAtom);
  const navigate = useNavigate();

  const mutation = useMutation<void, Error, LogoutAttempt>({
    mutationFn: ({ ownerToken }) =>
      ownerToken === null
        ? Promise.resolve()
        : logoutApi(apiClient, ownerToken),
    onSettled: async (_data, _error, attempt) => {
      const currentToken = readStoredToken();
      if (isReplacementSession(attempt, currentToken)) {
        queryClient.clear();
        await recoverReplacementSession(navigate, logout);
        return;
      }

      // Clear identity before navigation so /login's authenticated guard cannot
      // bounce back. Delay cache cleanup so mounted queries cannot refetch while
      // the old authenticated shell is still navigating away.
      logout();
      await navigateToLogin(navigate, "normal");

      const tokenAfterNavigation = readStoredToken();
      if (
        tokenAfterNavigation !== null &&
        tokenAfterNavigation === attempt.ownerToken
      ) {
        logout();
      }
      queryClient.clear();
      if (isReplacementSession(attempt, tokenAfterNavigation)) {
        await recoverReplacementSession(navigate, logout);
      }
    },
  });

  const controls = useSingleFlightLogout(mutation);
  return { ...mutation, ...controls };
}
