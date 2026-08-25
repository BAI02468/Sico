import type { AxiosInstance } from "axios";
import { z } from "zod";

import { SKILL_ENDPOINTS } from "../../../constants/endpoints";
import { apiResponseSchema, assertOk, unwrapData } from "../../../schemas/api";
import { type Paged } from "../../../schemas/paginated";
import { DEFAULT_SKILLS_PAGE_SIZE } from "../constants";
import {
  persistedSkillItemSchema,
  type SkillAction,
  type SkillDetail,
  skillDetailSchema,
  type SkillFile,
  type SkillItem,
  skillItemSchema,
  type SkillStatus,
  SkillStatusSchema,
} from "../schemas/skill";

const listEnvelope = apiResponseSchema(
  z
    .object({
      skills: z.array(skillItemSchema).default([]),
      total: z.number().int().nonnegative().default(0),
      hasNext: z.boolean().default(false),
    })
    .transform(
      ({ skills, total, hasNext }): Paged<SkillItem> => ({
        items: skills.filter(
          (skill) => persistedSkillItemSchema.safeParse(skill).success,
        ),
        total,
        hasNext,
      }),
    ),
);

const detailEnvelope = apiResponseSchema(skillDetailSchema);
const statusEnvelope = apiResponseSchema(
  z.object({ status: SkillStatusSchema }),
);

export type SkillsParams = {
  agentId: string;
  page?: number;
  pageSize?: number;
  projectId?: number;
  status?: number;
};

export async function fetchSkills(
  apiClient: AxiosInstance,
  {
    agentId,
    page = 1,
    pageSize = DEFAULT_SKILLS_PAGE_SIZE,
    projectId,
    status,
  }: SkillsParams,
): Promise<Paged<SkillItem>> {
  const res = await apiClient.get<unknown>(SKILL_ENDPOINTS.list, {
    params: { agentId, page, pageSize, projectId, status },
  });
  return unwrapData(listEnvelope.parse(res.data), "fetchSkills");
}

export async function fetchSkillDetail(
  apiClient: AxiosInstance,
  id: number,
): Promise<SkillDetail> {
  const res = await apiClient.get<unknown>(SKILL_ENDPOINTS.root, {
    params: { id },
  });
  return unwrapData(detailEnvelope.parse(res.data), "fetchSkillDetail");
}

export async function fetchSkillStatus(
  apiClient: AxiosInstance,
  { id, version }: { id: number; version: string },
): Promise<SkillStatus> {
  const res = await apiClient.get<unknown>(SKILL_ENDPOINTS.status, {
    params: { id, version },
  });
  return unwrapData(statusEnvelope.parse(res.data), "fetchSkillStatus").status;
}

const createEnvelope = apiResponseSchema(z.object({ skill: skillItemSchema }));

const updateResultSchema = z.object({
  skillId: z.number().int().safe(),
  version: z.string(),
  versionId: z.number().int().safe().optional(),
  name: z.string().default(""),
  description: z.string().default(""),
});
export type SkillUpdateResult = z.infer<typeof updateResultSchema>;
const updateEnvelope = apiResponseSchema(updateResultSchema);

export async function createSkill(
  apiClient: AxiosInstance,
  {
    agentId,
    assetId,
    projectId,
  }: { agentId: string; assetId: number; projectId?: number },
): Promise<SkillItem> {
  const res = await apiClient.post<unknown>(SKILL_ENDPOINTS.root, {
    agentId,
    assetId,
    projectId,
  });
  return unwrapData(createEnvelope.parse(res.data), "createSkill").skill;
}

export type UpdateSkillInput = {
  id: number;
  currentVersion: string;
  actions?: SkillAction[];
  assetId?: number;
  files?: Pick<SkillFile, "path" | "content">[];
};

export async function updateSkill(
  apiClient: AxiosInstance,
  input: UpdateSkillInput,
): Promise<SkillUpdateResult> {
  const res = await apiClient.put<unknown>(SKILL_ENDPOINTS.root, input);
  return unwrapData(updateEnvelope.parse(res.data), "updateSkill");
}

export async function deleteSkill(
  apiClient: AxiosInstance,
  id: number,
): Promise<void> {
  const res = await apiClient.delete<unknown>(SKILL_ENDPOINTS.root, {
    params: { id },
  });
  assertOk(apiResponseSchema(z.unknown()).parse(res.data), "deleteSkill");
}
