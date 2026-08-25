import { Trans, useLingui } from "@lingui/react/macro";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@sico/ui";
import { cn } from "@sico/ui/lib/utils.ts";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { CalendarClock, Ellipsis, Plus } from "lucide-react";
import { type ReactElement, Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { AddDwDialog } from "./add-dw-dialog";
import { DigitalWorkersGrid } from "./digital-workers-grid";
import { DigitalWorkersGridSkeleton } from "./digital-workers-grid-skeleton";
import { ErrorView } from "../../../components/error-view";
import { ScheduledTasksDialog } from "../../scheduled-task";

/**
 * Feature root for `/digital-worker`. `useQueryErrorResetBoundary` is
 * critical: without piping its `reset` into `ErrorBoundary.onReset`,
 * "Retry" remounts the subtree but the failed query stays in error
 * state, so the suspense hook re-throws on remount and the user is
 * stuck.
 *
 * Layout: the header stays fixed; the grid below owns its own scroll region +
 * a fixed inactive-toggle footer (three-part flex). This wrapper only bounds
 * the height (`flex-1 min-h-0`) — it does NOT scroll.
 */
export function DigitalWorkers(): ReactElement {
  const { t } = useLingui();
  const { reset } = useQueryErrorResetBoundary();
  const [addOpen, setAddOpen] = useState(false);
  const [scheduledTasksOpen, setScheduledTasksOpen] = useState(false);
  const modalOpen = addOpen || scheduledTasksOpen;

  return (
    <div className="flex h-full w-full flex-col gap-6 pt-10 pb-2">
      <header className="flex items-end justify-between gap-4 px-16">
        <div
          className={cn(
            "flex flex-col gap-1 transition-[filter] duration-100",
            modalOpen && "blur-xs",
          )}
        >
          <h1
            tabIndex={-1}
            className="text-foreground-primary text-3xl leading-tight font-medium outline-none"
          >
            <Trans id="digitalWorker.page.title">Digital Workers</Trans>
          </h1>
          <p className="text-foreground-secondary text-sm leading-normal">
            <Trans id="digitalWorker.page.subtitle">
              Browse your digital workforce
            </Trans>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="subtle" onClick={() => setScheduledTasksOpen(true)}>
            <CalendarClock aria-hidden="true" />
            <Trans id="digitalWorker.page.scheduledTaskButton">
              Scheduled task
            </Trans>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="subtle"
                  size="icon"
                  aria-label={t({
                    id: "digitalWorker.page.actions",
                    message: "Digital Worker actions",
                  })}
                />
              }
            >
              <Ellipsis aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36!">
              <DropdownMenuItem onClick={() => setAddOpen(true)}>
                <Plus aria-hidden="true" />
                <Trans id="digitalWorker.page.addMenuItem">
                  Digital Worker
                </Trans>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <ErrorBoundary FallbackComponent={ErrorView} onReset={reset}>
          <Suspense
            fallback={
              <div className="px-16">
                <DigitalWorkersGridSkeleton />
              </div>
            }
          >
            <DigitalWorkersGrid onAddDw={() => setAddOpen(true)} />
          </Suspense>
        </ErrorBoundary>
      </div>
      {addOpen && <AddDwDialog open={addOpen} onOpenChange={setAddOpen} />}
      <ScheduledTasksDialog
        open={scheduledTasksOpen}
        onOpenChange={setScheduledTasksOpen}
      />
    </div>
  );
}
