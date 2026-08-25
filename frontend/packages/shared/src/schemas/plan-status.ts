import { z } from "zod";

export const PlanStatusSchema = z.enum({
  UNKNOWN: 0,
  NO_PLAN: 1,
  RUNNING: 2,
  COMPLETED: 3,
  FAILED: 4,
  REQUIRE_HUMAN_INPUT: 5,
  CANCELLED: 6,
});
export type PlanStatus = z.infer<typeof PlanStatusSchema>;
