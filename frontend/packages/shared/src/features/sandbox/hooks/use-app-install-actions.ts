import { i18n } from "@lingui/core";
import { msg, t } from "@lingui/core/macro";
import { toast } from "@sico/ui";
import { type MutateOptions } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { InstallError, useInstallApp } from "./use-install-app";
import { useUninstallApp } from "./use-uninstall-app";
import { type EmulatorApp } from "../schemas/emulator-app";

// Dynamic toast copy: descriptors defined at module scope so the message stays
// a static, extractable literal and the runtime values fill named placeholders
// via `i18n._({ ...COPY, values })`.
const INSTALLING_COPY = msg({
  id: "sandbox.install.status.installing",
  message: "Installing {name}…",
});
const INSTALLED_COPY = msg({
  id: "sandbox.install.success.installed",
  message: "{name} installed.",
});
const UNINSTALLING_COPY = msg({
  id: "sandbox.uninstall.status.uninstalling",
  message: "Uninstalling {name}{scope}…",
});
const UNINSTALL_PARTIAL_COPY = msg({
  id: "sandbox.uninstall.success.partial",
  message: "{name} uninstalled except {failed}.",
});
const UNINSTALL_COMPLETE_COPY = msg({
  id: "sandbox.uninstall.success.complete",
  message: "{name} uninstalled{scope}.",
});
const UPLOAD_FAILED_COPY = msg({
  id: "sandbox.install.error.uploadFailed",
  message: "Couldn't upload {name}. Please try again.",
});
const COULD_NOT_INSTALL_ON_DEVICE_COPY = msg({
  id: "sandbox.install.error.couldNotInstallOnDevice",
  message: "{name} could not be installed on the device.",
});
// `count`-driven plural written as an ICU string (module-scope `msg` has no
// `count` binding for the `plural` macro); resolved with the count at call time.
const COULD_NOT_INSTALL_ON_DEVICES_COPY = msg({
  id: "sandbox.install.error.couldNotInstallOnDevices",
  message:
    "{count, plural, one {Couldn't install {name} on # device.} other {Couldn't install {name} on # devices.}}",
});
const COULD_NOT_INSTALL_COPY = msg({
  id: "sandbox.install.error.couldNotInstall",
  message: "Couldn't install {name}. Please try again.",
});

// Which devices an install targets: just the device in view, or every attached
// one. A pure UI discriminant (never crosses a parse boundary), owned here in
// the sandbox layer so the install control can depend inward on it.
export type InstallScope = "current" | "all";

// The current device + the full device set, so an action can target one or all.
export type DeviceScope = { current: string; all: string[] };

// Success copy for an uninstall: names the devices it couldn't clear when an
// "all devices" uninstall was partial, otherwise the plain scoped message.
function uninstallMessage(
  name: string,
  scope: string,
  failedDeviceNames: string[],
): string {
  if (failedDeviceNames.length > 0) {
    return i18n._(
      UNINSTALL_PARTIAL_COPY.id,
      { name, failed: failedDeviceNames.join(", ") },
      UNINSTALL_PARTIAL_COPY,
    );
  }
  return i18n._(
    UNINSTALL_COMPLETE_COPY.id,
    { name, scope },
    UNINSTALL_COMPLETE_COPY,
  );
}

export type AppInstallActions = {
  installPending: boolean;
  uninstallPending: boolean;
  runInstall: (file: File, scope: InstallScope, ids: DeviceScope) => void;
  runUninstall: (
    app: EmulatorApp,
    forAllDevices: boolean,
    ids: DeviceScope,
  ) => void;
};

type InstallMutate = ReturnType<typeof useInstallApp>["mutate"];
type UninstallMutate = ReturnType<typeof useUninstallApp>["mutate"];
type Guard = ReturnType<typeof usePendingToastDismiss>;

function createRunInstall(installMutate: InstallMutate, guard: Guard) {
  return (file: File, scope: InstallScope, ids: DeviceScope): void => {
    const sandboxIds = scope === "all" ? ids.all : [ids.current];
    const name = file.name.replace(/\.apk$/i, "");
    const toastId = toast.loading(
      i18n._(INSTALLING_COPY.id, { name }, INSTALLING_COPY),
    );
    installMutate(
      { file, sandboxIds },
      guard(toastId, {
        onSuccess: () =>
          toast.success(i18n._(INSTALLED_COPY.id, { name }, INSTALLED_COPY), {
            id: toastId,
          }),
        onError: (error) => handleInstallError(error, name, toastId),
      }),
    );
  };
}

function createRunUninstall(uninstallMutate: UninstallMutate, guard: Guard) {
  return (app: EmulatorApp, forAllDevices: boolean, ids: DeviceScope): void => {
    const sandboxIds = forAllDevices ? ids.all : [ids.current];
    const name = app.appName.length > 0 ? app.appName : app.package;
    const scope = forAllDevices
      ? t({
          id: "sandbox.uninstall.scope.allDevices",
          message: " from all devices",
        })
      : "";
    const toastId = toast.loading(
      i18n._(UNINSTALLING_COPY.id, { name, scope }, UNINSTALLING_COPY),
    );
    uninstallMutate(
      { package: app.package, sandboxIds },
      guard(toastId, {
        onSuccess: ({ failedDeviceNames }) => {
          toast.success(uninstallMessage(name, scope, failedDeviceNames), {
            id: toastId,
          });
        },
        onError: () =>
          toast.error(
            t({
              id: "sandbox.uninstall.error.failed",
              message: "Uninstall failed.",
            }),
            { id: toastId },
          ),
      }),
    );
  };
}

// A failure toast's copy: a title (the clamped 2-line headline) and, for a
// multi-device rejection, a description carrying the per-device reasons.
export type InstallErrorToast = { title: string; description?: string };

// Failure copy by phase. `upload` gets dedicated copy. `device` surfaces the
// backend's raw adb reason(s): a single failing device puts its one reason in
// the title (it fits the 2-line card); multiple failing devices can't all fit
// the clamped title, so the title summarises the count and the reasons move to
// the description slot. Reasons join with "; " — the toast renders title and
// description as plain text, so a "\n" would collapse to a space anyway. `start`
// and any non-`InstallError` fall through to the generic message. `aborted`
// never reaches here — the caller dismisses it silently.
export function installErrorMessage(
  error: unknown,
  name: string,
): InstallErrorToast {
  if (error instanceof InstallError) {
    if (error.phase === "upload") {
      return {
        title: i18n._(UPLOAD_FAILED_COPY.id, { name }, UPLOAD_FAILED_COPY),
      };
    }
    if (error.phase === "device") {
      const [first, ...rest] = error.deviceReasons;
      if (first === undefined) {
        return {
          title: i18n._(
            COULD_NOT_INSTALL_ON_DEVICE_COPY.id,
            { name },
            COULD_NOT_INSTALL_ON_DEVICE_COPY,
          ),
        };
      }
      if (rest.length === 0) {
        return { title: first };
      }
      return {
        title: i18n._(
          COULD_NOT_INSTALL_ON_DEVICES_COPY.id,
          { name, count: error.deviceReasons.length },
          COULD_NOT_INSTALL_ON_DEVICES_COPY,
        ),
        description: error.deviceReasons.join("; "),
      };
    }
  }
  return {
    title: i18n._(COULD_NOT_INSTALL_COPY.id, { name }, COULD_NOT_INSTALL_COPY),
  };
}

// Drive the install failure toast off the phase: a user-driven cancel (panel
// close / agent-instance change) clears the loading toast silently; everything
// else shows a phase-aware message (device rejections carry the raw adb reason).
export function handleInstallError(
  error: unknown,
  name: string,
  toastId: string | number,
): void {
  if (error instanceof InstallError && error.phase === "aborted") {
    toast.dismiss(toastId);
    return;
  }
  const { title, description } = installErrorMessage(error, name);
  toast.error(title, { id: toastId, description });
}

// Loading toasts have Infinity duration, and react-query gates mutate-level
// callbacks behind `hasListeners()` — so if the panel unmounts mid-mutation
// (the common "close the panel" path), onSuccess/onError never fire and the
// "Installing…"/"Uninstalling…" toast orphans on screen forever. This hook
// returns `guard(toastId, opts)`: it records the id, layers an `onSettled` that
// forgets it, and dismisses whatever's still pending on unmount.
function usePendingToastDismiss(): <TData, TVars>(
  toastId: string | number,
  opts: MutateOptions<TData, Error, TVars>,
) => MutateOptions<TData, Error, TVars> {
  const pending = useRef(new Set<string | number>());
  useEffect(() => {
    const ids = pending.current;
    return () => {
      for (const id of ids) {
        toast.dismiss(id);
      }
      ids.clear();
    };
  }, []);
  return (toastId, opts) => {
    pending.current.add(toastId);
    return {
      ...opts,
      onSettled: (...args) => {
        pending.current.delete(toastId);
        opts.onSettled?.(...args);
      },
    };
  };
}

// Install/uninstall orchestration for the manage-apps panel: runs the mutations
// and drives the progress toasts (loading → success/error, updating one toast
// by id). Split out of `SandboxApps` so the panel component stays within the
// function-length budget and the toast wording lives in one place.
export function useAppInstallActions(
  agentInstanceId: number,
): AppInstallActions {
  const install = useInstallApp(agentInstanceId);
  const uninstall = useUninstallApp(agentInstanceId);
  const guard = usePendingToastDismiss();

  const runInstall = createRunInstall(install.mutate, guard);
  const runUninstall = createRunUninstall(uninstall.mutate, guard);

  return {
    installPending: install.isPending,
    uninstallPending: uninstall.isPending,
    runInstall,
    runUninstall,
  };
}
