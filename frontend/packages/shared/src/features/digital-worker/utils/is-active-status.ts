import { type Agent, AgentStatusSchema } from "../schemas/agent";

// Only workers that are already usable or newly created may accept new work.
// Missing, transitional, inactive, aborted, and forward-unknown values fail closed.
export function isActiveStatus(status: Agent["status"]): boolean {
  return (
    status === AgentStatusSchema.enum.ACTIVE ||
    status === AgentStatusSchema.enum.NEW
  );
}
