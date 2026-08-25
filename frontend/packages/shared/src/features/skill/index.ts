export { SetupBasicInfo } from "./components/setup/setup-basic-info";
export { SetupSkillSection } from "./components/setup/setup-skill-section";
export {
  SkillSaveRegistryProvider,
  useSkillSaveRegistry,
  type SkillSaveTarget,
} from "./components/setup/skill-save-registry";
export { SETUP_SKILLS_PAGE_SIZE } from "./constants";

export { type Role, roleSchema, rolesPayloadSchema } from "./schemas/roles";
export {
  type SkillDetail,
  type SkillItem,
  type SkillStatus,
  type SkillVersion,
  SkillStatusSchema,
  skillDetailSchema,
  skillItemSchema,
} from "./schemas/skill";

export {
  useSkillsQuery,
  useSkillsSuspenseQuery,
  useSkillsSuspenseInfiniteQuery,
  skillsQueryOptions,
  skillsInfiniteQueryOptions,
} from "./hooks/use-skills-query";
export {
  useSkillDetailQuery,
  skillDetailQueryOptions,
} from "./hooks/use-skill-detail-query";
export { useSkillStatusQuery } from "./hooks/use-skill-status-query";
export {
  useRolesQuery,
  useRolesSuspenseQuery,
  rolesQueryOptions,
} from "./hooks/use-roles-query";
export {
  useCreateSkillMutation,
  useUpdateSkillMutation,
  useDeleteSkillMutation,
  useUploadSkillAssetMutation,
} from "./hooks/use-skill-mutations";
