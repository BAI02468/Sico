import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { Dialog, DialogContent } from "@sico/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios, { type AxiosAdapter } from "axios";
import { type ReactElement, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { type AttachmentUploadItem } from "@/components/attachment-input";
import {
  AGENT_ENDPOINTS,
  SCHEDULED_TASK_ENDPOINTS,
} from "@/constants/endpoints";
import { ScheduledTaskFormView } from "@/features/scheduled-task/components/scheduled-task-form-view";
import { ScheduledTaskGridSkeleton } from "@/features/scheduled-task/components/scheduled-task-grid-skeleton";
import { ScheduledTaskListContent } from "@/features/scheduled-task/components/scheduled-task-list-content";
import { ScheduledTaskListView } from "@/features/scheduled-task/components/scheduled-task-list-view";
import { ScheduledTasksDialogConfirmations } from "@/features/scheduled-task/components/scheduled-tasks-dialog-confirmations";
import { ScheduledTasksDialogHeader } from "@/features/scheduled-task/components/scheduled-tasks-dialog-header";
import { type ScheduledTaskAttachments } from "@/features/scheduled-task/hooks/use-scheduled-task-attachments";
import {
  type ScheduledTask,
  scheduledTaskSchema,
} from "@/features/scheduled-task/schemas/scheduled-task";
import { type ScheduledTaskFormValues } from "@/features/scheduled-task/schemas/scheduled-task-form";
import { makeOkEnvelope } from "@/schemas/api";
import { ApiClientProvider } from "@/services/api-client-context";

if (!i18n.locale) {
  i18n.loadAndActivate({ locale: "en", messages: {} });
}

type DialogState =
  | "InitialLoading"
  | "IncrementalLoading"
  | "Empty"
  | "Populated"
  | "InitialError"
  | "NextPageError"
  | "CreateForm"
  | "WeeklyForm"
  | "EditForm"
  | "CustomScheduleEdit"
  | "UploadingAttachment"
  | "MutationPending"
  | "DeleteConfirmation"
  | "DiscardConfirmation";

type StoryArgs = { state: DialogState };

const noop = (): void => {};

function makeTask(overrides: Partial<ScheduledTask> = {}): ScheduledTask {
  return scheduledTaskSchema.parse({
    agentInstanceId: 8,
    attachments: [],
    createdAt: 1_700_000_000_000,
    creatorUsername: "operator@example.com",
    cronExpression: "0 9 * * *",
    enabled: true,
    id: 1,
    lastRunAt: 0,
    message: "Prepare the daily customer report.",
    name: "Daily customer report",
    nextRunAt: 1_700_000_100_000,
    timezone: "America/New_York",
    updatedAt: 1_700_000_000_000,
    ...overrides,
  });
}

const primaryTask = makeTask();
const pausedTask = makeTask({
  enabled: false,
  id: 2,
  name: "Weekly compliance review",
  cronExpression: "30 14 * * 1",
});

type DailyFormValues = Extract<ScheduledTaskFormValues, { frequency: "daily" }>;

type WeeklyFormValues = Extract<
  ScheduledTaskFormValues,
  { frequency: "weekly" }
>;

type CustomFormValues = Extract<
  ScheduledTaskFormValues,
  { frequency: "custom" }
>;

function makeDailyFormValues(): DailyFormValues {
  return {
    agentInstanceId: 8,
    attachments: [],
    enabled: true,
    frequency: "daily",
    message: "Prepare the daily customer report.",
    name: "Daily customer report",
    sendEmailOnComplete: false,
    time: "09:00",
    timezone: "America/New_York",
  };
}

function makeWeeklyFormValues(): WeeklyFormValues {
  return {
    ...makeDailyFormValues(),
    frequency: "weekly",
    weekday: 1,
  };
}

function makeCustomFormValues(): CustomFormValues {
  return {
    ...makeDailyFormValues(),
    frequency: "custom",
    originalCronExpression: "0/15 9-17 * * 1-5",
    time: "",
  };
}

function createStoryAdapter(state: DialogState): AxiosAdapter {
  return async (config) => {
    if (config.url === AGENT_ENDPOINTS.singleAgentInstances) {
      return {
        config,
        data: makeOkEnvelope({
          hasNext: false,
          instances: [{ id: 8, name: "Reporting Worker" }],
          total: 1,
        }),
        headers: {},
        status: 200,
        statusText: "OK",
      };
    }
    if (config.url === SCHEDULED_TASK_ENDPOINTS.list) {
      if (state === "InitialError") {
        throw new Error("Scheduled tasks are unavailable in this story.");
      }
      return {
        config,
        data: makeOkEnvelope({
          hasNext: false,
          tasks: [primaryTask, pausedTask],
          total: 2,
        }),
        headers: {},
        status: 200,
        statusText: "OK",
      };
    }
    if (config.url === SCHEDULED_TASK_ENDPOINTS.root) {
      return {
        config,
        data: makeOkEnvelope(primaryTask),
        headers: {},
        status: 200,
        statusText: "OK",
      };
    }
    throw new Error(`Unhandled story request: ${config.url}`);
  };
}

function ListContent({
  isFetchingNextPage = false,
  isNextPageError = false,
  tasks = [primaryTask, pausedTask],
}: {
  isFetchingNextPage?: boolean;
  isNextPageError?: boolean;
  tasks?: ScheduledTask[];
}): ReactElement {
  return (
    <ScheduledTaskListContent
      tasks={tasks}
      workersById={new Map([[8, { id: 8, name: "Reporting Worker" }]])}
      isFetchingNextPage={isFetchingNextPage}
      isNextPageError={isNextPageError}
      isWorkersPending={false}
      isTogglePending={() => false}
      onCreate={noop}
      onEdit={noop}
      onRetryNextPage={noop}
      onToggle={noop}
    />
  );
}

function staticAttachments(
  items: AttachmentUploadItem[] = [],
): ScheduledTaskAttachments {
  return {
    addFile: noop,
    anyUploading: items.some((item) => item.status === "uploading"),
    attachments: items,
    clear: noop,
    fileError: null,
    readyAttachments: items.flatMap((item) =>
      item.status === "ready" ? [item.assetRef] : [],
    ),
    removeAttachment: noop,
    reset: noop,
  };
}

function FormPreview({
  attachments,
  isSaving = false,
  values,
}: {
  attachments?: AttachmentUploadItem[];
  isSaving?: boolean;
  values: ScheduledTaskFormValues;
}): ReactElement {
  const form = useForm<ScheduledTaskFormValues>({ defaultValues: values });
  return (
    <ScheduledTaskFormView
      form={form}
      attachments={staticAttachments(attachments)}
      isSaving={isSaving}
      onCancel={noop}
      onSubmit={noop}
    />
  );
}

function UploadingForm(): ReactElement {
  const attachments = [
    {
      abortHandle: new AbortController(),
      file: new File(["report"], "customer-report.pdf", {
        type: "application/pdf",
      }),
      localId: "customer-report",
      status: "uploading" as const,
    },
  ];
  return (
    <FormPreview attachments={attachments} values={makeDailyFormValues()} />
  );
}

function DialogStatePreview({ state }: StoryArgs): ReactElement {
  if (state === "InitialLoading") {
    return <ScheduledTaskGridSkeleton />;
  }
  if (state === "IncrementalLoading") {
    return <ListContent isFetchingNextPage />;
  }
  if (state === "Empty") {
    return <ListContent tasks={[]} />;
  }
  if (state === "Populated") {
    return <ListContent />;
  }
  if (state === "InitialError") {
    return <ScheduledTaskListView onCreate={noop} onEdit={noop} />;
  }
  if (state === "NextPageError") {
    return <ListContent isNextPageError />;
  }
  if (state === "CreateForm") {
    return <FormPreview values={makeDailyFormValues()} />;
  }
  if (state === "WeeklyForm") {
    return <FormPreview values={makeWeeklyFormValues()} />;
  }
  if (state === "EditForm") {
    return (
      <FormPreview
        values={{ ...makeDailyFormValues(), sendEmailOnComplete: true }}
      />
    );
  }
  if (state === "CustomScheduleEdit") {
    return <FormPreview values={makeCustomFormValues()} />;
  }
  if (state === "UploadingAttachment") {
    return <UploadingForm />;
  }
  if (state === "MutationPending") {
    return <FormPreview isSaving values={makeDailyFormValues()} />;
  }
  if (state === "DeleteConfirmation") {
    return (
      <ScheduledTasksDialogConfirmations
        deletePending={false}
        deleteTask={primaryTask}
        discardOpen={false}
        onCancelDiscard={noop}
        onConfirmDelete={noop}
        onConfirmDiscard={noop}
        onDeleteOpenChange={noop}
      />
    );
  }
  return (
    <ScheduledTasksDialogConfirmations
      deletePending={false}
      discardOpen
      onCancelDiscard={noop}
      onConfirmDelete={noop}
      onConfirmDiscard={noop}
      onDeleteOpenChange={noop}
    />
  );
}

function StoryFrame({ state }: StoryArgs): ReactElement {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  const apiClient = useMemo(
    () => axios.create({ adapter: createStoryAdapter(state) }),
    [state],
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={apiClient}>
        <Dialog open>
          <DialogContent
            variant="content"
            className="flex h-150 w-150 flex-col"
            showCloseButton={false}
          >
            <ScheduledTasksDialogHeader
              actionsLabel="Scheduled task actions"
              createLabel={state === "Populated" ? "Create new" : undefined}
              deleteLabel="Delete"
              onCreate={noop}
              title="Scheduled task"
            />
            <div className="min-h-0 flex-1">
              <DialogStatePreview state={state} />
            </div>
          </DialogContent>
        </Dialog>
      </ApiClientProvider>
    </QueryClientProvider>
  );
}

const meta: Meta<StoryArgs> = {
  title: "Features/ScheduledTasks/Dialog",
  decorators: [
    (Story) => (
      <I18nProvider i18n={i18n}>
        <Story />
      </I18nProvider>
    ),
  ],
  args: { state: "Populated" },
  parameters: {
    docs: {
      source: {
        code: "<ScheduledTasksDialog open onOpenChange={onOpenChange} />",
      },
    },
  },
  render: (args) => <StoryFrame state={args.state} />,
};

export default meta;
type Story = StoryObj<StoryArgs>;

/** First-load card placeholders before the scheduled-task query resolves. */
export const InitialLoading: Story = { args: { state: "InitialLoading" } };

/** Existing task cards with additional page placeholders while pagination advances. */
export const IncrementalLoading: Story = {
  args: { state: "IncrementalLoading" },
};

/** The no-task state with its primary create action. */
export const Empty: Story = { args: { state: "Empty" } };

/** Two scheduled tasks with distinct enabled states and schedules. */
export const Populated: Story = { args: { state: "Populated" } };

/** The recoverable list error returned before any task data is available. */
export const InitialError: Story = { args: { state: "InitialError" } };

/** The inline retry affordance after a later task page fails. */
export const NextPageError: Story = { args: { state: "NextPageError" } };

/** A ready-to-complete daily task creation form. */
export const CreateForm: Story = { args: { state: "CreateForm" } };

/** A weekly task form exposing the day-of-week selector. */
export const WeeklyForm: Story = { args: { state: "WeeklyForm" } };

/** An editable task form with its destructive delete action. */
export const EditForm: Story = { args: { state: "EditForm" } };

/** An existing custom cron schedule rendered as a read-only schedule value. */
export const CustomScheduleEdit: Story = {
  args: { state: "CustomScheduleEdit" },
};

/** An attachment upload that keeps submission unavailable until completion. */
export const UploadingAttachment: Story = {
  args: { state: "UploadingAttachment" },
};

/** A save in progress that locks fields plus Save/Delete while keeping Cancel available. */
export const MutationPending: Story = { args: { state: "MutationPending" } };

/** The destructive confirmation shown before deleting a scheduled task. */
export const DeleteConfirmation: Story = {
  args: { state: "DeleteConfirmation" },
};

/** The confirmation shown when navigation would discard unsaved form changes. */
export const DiscardConfirmation: Story = {
  args: { state: "DiscardConfirmation" },
};
