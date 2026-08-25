import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type SaveQueueStatus =
  | "idle"
  | "scheduled"
  | "saving"
  | "saved"
  | "error"
  | "conflict";

type QueueOptions<T> = {
  delayMs?: number;
  save: (snapshot: T) => Promise<void>;
  onSuccess?: (snapshot: T) => void | Promise<void>;
  isConflict?: (error: unknown) => boolean;
  equals?: (left: T, right: T) => boolean;
};

type QueueView = { status: SaveQueueStatus; error: unknown };
type SnapshotSlot<T> = { value: T } | undefined;

export function aggregateSaveQueueStatus(
  statuses: readonly (SaveQueueStatus | undefined)[],
): SaveQueueStatus {
  if (statuses.includes("conflict")) {
    return "conflict";
  }
  if (statuses.includes("error")) {
    return "error";
  }
  if (statuses.includes("saving")) {
    return "saving";
  }
  if (statuses.includes("scheduled")) {
    return "scheduled";
  }
  if (statuses.includes("saved")) {
    return "saved";
  }
  return "idle";
}

export type LatestSaveQueue<T> = QueueView & {
  hasUnsettled: boolean;
  schedule: (snapshot: T) => void;
  flush: () => Promise<boolean>;
  retry: () => Promise<boolean>;
  cancelPending: () => void;
};

class SaveQueueController<T> {
  private active = true;
  private pending: SnapshotSlot<T>;
  private running: Promise<boolean> | undefined;
  private inFlightSnapshot: SnapshotSlot<T>;
  private lastSavedSnapshot: SnapshotSlot<T>;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private status: SaveQueueStatus = "idle";

  constructor(
    private readonly getOptions: () => QueueOptions<T>,
    private readonly setView: Dispatch<SetStateAction<QueueView>>,
  ) {}

  activate(): void {
    this.active = true;
    if (
      this.pending !== undefined &&
      !this.running &&
      this.timer === undefined &&
      this.status === "scheduled"
    ) {
      this.armTimer();
    }
  }

  dispose(): void {
    this.active = false;
    this.clearTimer();
  }

  schedule(snapshot: T): void {
    const equals = this.getOptions().equals ?? Object.is;
    if (this.pending !== undefined && equals(this.pending.value, snapshot)) {
      return;
    }
    if (
      this.status === "saved" &&
      this.lastSavedSnapshot !== undefined &&
      equals(this.lastSavedSnapshot.value, snapshot)
    ) {
      return;
    }
    if (
      this.running &&
      this.inFlightSnapshot !== undefined &&
      equals(this.inFlightSnapshot.value, snapshot)
    ) {
      this.pending = undefined;
      return;
    }
    this.pending = { value: snapshot };
    if (this.status === "error" || this.status === "conflict" || this.running) {
      return;
    }
    this.clearTimer();
    this.updateView({ status: "scheduled", error: null });
    this.armTimer();
  }

  flush(): Promise<boolean> {
    this.clearTimer();
    if (this.status === "error" || this.status === "conflict") {
      return Promise.resolve(false);
    }
    return this.drain();
  }

  retry(): Promise<boolean> {
    this.clearTimer();
    return this.drain();
  }

  cancelPending(): void {
    this.clearTimer();
    this.pending = undefined;
    if (!this.running && this.status !== "idle") {
      this.updateView({ status: "idle", error: null });
    }
  }

  private updateView(view: QueueView): void {
    this.status = view.status;
    this.setView(view);
  }

  private armTimer(): void {
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.drain();
    }, this.getOptions().delayMs ?? 600);
  }

  private clearTimer(): void {
    if (this.timer === undefined) {
      return;
    }
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  private drain(): Promise<boolean> {
    if (this.running) {
      return this.running;
    }
    const tracked = this.run().finally(() => {
      if (this.running === tracked) {
        this.running = undefined;
      }
    });
    this.running = tracked;
    return tracked;
  }

  private async run(): Promise<boolean> {
    while (this.active && this.pending !== undefined) {
      const snapshot = this.pending.value;
      this.pending = undefined;
      this.inFlightSnapshot = { value: snapshot };
      this.updateView({ status: "saving", error: null });
      try {
        await this.getOptions().save(snapshot);
        this.lastSavedSnapshot = { value: snapshot };
        await this.getOptions().onSuccess?.(snapshot);
        this.inFlightSnapshot = undefined;
      } catch (error) {
        this.inFlightSnapshot = undefined;
        this.pending ??= { value: snapshot };
        const conflict = this.getOptions().isConflict?.(error) ?? false;
        this.updateView({ status: conflict ? "conflict" : "error", error });
        return false;
      }
    }
    if (this.active) {
      this.updateView({ status: "saved", error: null });
    }
    return true;
  }
}

function isUnsettled(status: SaveQueueStatus): boolean {
  return (
    status === "scheduled" ||
    status === "saving" ||
    status === "error" ||
    status === "conflict"
  );
}

export function useLatestSaveQueue<T>(
  options: QueueOptions<T>,
): LatestSaveQueue<T> {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const [view, setView] = useState<QueueView>({ status: "idle", error: null });
  const controllerRef = useRef<SaveQueueController<T> | null>(null);
  controllerRef.current ??= new SaveQueueController(
    () => optionsRef.current,
    setView,
  );
  const controller = controllerRef.current;

  useEffect(() => {
    controller.activate();
    return () => controller.dispose();
  }, [controller]);

  const schedule = useCallback(
    (snapshot: T): void => controller.schedule(snapshot),
    [controller],
  );
  const flush = useCallback(() => controller.flush(), [controller]);
  const retry = useCallback(() => controller.retry(), [controller]);
  const cancelPending = useCallback(
    () => controller.cancelPending(),
    [controller],
  );

  return useMemo(
    () => ({
      ...view,
      hasUnsettled: isUnsettled(view.status),
      schedule,
      flush,
      retry,
      cancelPending,
    }),
    [cancelPending, flush, retry, schedule, view],
  );
}
