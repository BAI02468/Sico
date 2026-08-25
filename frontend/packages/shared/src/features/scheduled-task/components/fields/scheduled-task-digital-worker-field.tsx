import { useLingui } from "@lingui/react/macro";
import { useAtomValue } from "jotai";
import { type JSX } from "react";
import { type Control, useWatch } from "react-hook-form";

import { ScheduledTaskDigitalWorkerSelect } from "./scheduled-task-digital-worker-select";
import { userAtom } from "../../../../atoms/auth-atom";
import {
  useAgentQuery,
  useAgentsQuery,
  useDedupedAgents,
} from "../../../digital-worker/hooks/use-agents-query";
import { type ScheduledTaskFormValues } from "../../schemas/scheduled-task-form";

type Props = {
  control: Control<ScheduledTaskFormValues>;
  disabled: boolean;
};

export function ScheduledTaskDigitalWorkerField({
  control,
  disabled,
}: Props): JSX.Element {
  const { t } = useLingui();
  const operatorUsername = useAtomValue(userAtom)?.email;
  const agentInstanceId = useWatch({ control, name: "agentInstanceId" });
  const agentsQuery = useAgentsQuery({ operatorUsername });
  const agents = useDedupedAgents(agentsQuery.data?.pages);
  const listedAgent = agents.find((agent) => agent.id === agentInstanceId);
  const detailQuery = useAgentQuery(agentInstanceId, {
    enabled: agentInstanceId > 0 && listedAgent === undefined,
  });
  const visibleAgents =
    listedAgent || !detailQuery.data ? agents : [detailQuery.data, ...agents];
  const placeholder = agentsQuery.isPending
    ? t({
        id: "scheduledTask.form.worker.loading",
        message: "Loading Digital Workers…",
      })
    : t({
        id: "scheduledTask.form.worker.placeholder",
        message: "Choose Digital worker",
      });

  return (
    <ScheduledTaskDigitalWorkerSelect
      agents={visibleAgents}
      control={control}
      disabled={disabled}
      fetchNextPage={agentsQuery.fetchNextPage}
      hasNextPage={agentsQuery.hasNextPage}
      isError={agentsQuery.isError}
      isFetchingNextPage={agentsQuery.isFetchingNextPage}
      isPending={agentsQuery.isPending}
      placeholder={placeholder}
    />
  );
}
