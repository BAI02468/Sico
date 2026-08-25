import { zodResolver } from "@hookform/resolvers/zod";
import { useLingui } from "@lingui/react/macro";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { SetupBasicInfoValues } from "../../skill/components/setup/setup-basic-info-values";

export function useStudioSetupForm(
  name: string,
  role: string,
): ReturnType<typeof useForm<SetupBasicInfoValues>> {
  const { t } = useLingui();
  return useForm<SetupBasicInfoValues>({
    resolver: zodResolver(
      z.object({
        name: z
          .string()
          .trim()
          .min(
            1,
            t({
              id: "studio.setupEditor.validation.roleNameRequired",
              message: "Role Name is required",
            }),
          ),
        role: z
          .string()
          .trim()
          .min(
            1,
            t({
              id: "studio.setupEditor.validation.industryTypeRequired",
              message: "Industry Type is required",
            }),
          ),
      }),
    ),
    defaultValues: { name, role },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
}
