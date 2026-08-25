import { useLingui } from "@lingui/react/macro";
import { toast } from "@sico/ui";
import { useNavigate } from "@tanstack/react-router";
import { type JSX, useEffect, useRef, useState } from "react";

import { CreateStudioAgentDialogView } from "./create-studio-agent-dialog-view";
import { useBoundOrganizationQuery } from "../../../hooks/use-bound-organization";
import { apiErrorMessage } from "../../../utils/api-error-message";
import { deriveState } from "../../digital-worker/utils/load-state";
import { useRolesQuery } from "../../skill";
import { useCreateSingleAgentMutation } from "../hooks/use-single-agent-mutations";
import { useStudioSetupForm } from "../hooks/use-studio-setup-form";

type Props = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
};

function rolesLoadState(
  roles: ReturnType<typeof useRolesQuery>,
): ReturnType<typeof deriveState> {
  return deriveState(
    roles.isPending,
    roles.isError && !roles.data?.length,
    roles.data?.length ?? 0,
  );
}

function organizationLoadState(
  organization: ReturnType<typeof useBoundOrganizationQuery>,
): ReturnType<typeof deriveState> {
  return deriveState(
    organization.isPending,
    organization.isError && !organization.data,
    organization.data ? 1 : 0,
  );
}

function useActiveFlag(): { current: boolean } {
  const activeRef = useRef(true);
  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);
  return activeRef;
}

export function CreateStudioAgentDialog({
  open,
  onOpenChange,
}: Props): JSX.Element {
  const { t } = useLingui();
  const navigate = useNavigate();
  const form = useStudioSetupForm("", "");
  const roles = useRolesQuery();
  const organization = useBoundOrganizationQuery();
  const createAgent = useCreateSingleAgentMutation();
  const activeRef = useActiveFlag();
  const submittingRef = useRef(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const rolesState = rolesLoadState(roles);
  const organizationState = organizationLoadState(organization);

  useEffect(() => {
    if (open) {
      form.reset({ name: "", role: "" });
    }
  }, [form, open]);

  const openSetup = async (agentId: string): Promise<void> => {
    setIsNavigating(true);
    try {
      await navigate({ to: "/studio/$agentId/setup", params: { agentId } });
      submittingRef.current = false;
      if (activeRef.current) {
        setIsNavigating(false);
      }
    } catch (error) {
      submittingRef.current = false;
      if (activeRef.current) {
        setIsNavigating(false);
        toast.error(
          apiErrorMessage(
            error,
            t({
              id: "studio.createDialog.navigationError",
              message:
                "This Digital Worker was created, but we couldn't open its setup.",
            }),
          ),
        );
        onOpenChange(false);
      }
    }
  };
  const onSubmit = form.handleSubmit(({ name, role }) => {
    if (
      submittingRef.current ||
      rolesState !== "ready" ||
      organizationState !== "ready" ||
      !organization.data
    ) {
      return;
    }
    submittingRef.current = true;
    createAgent.mutate(
      { name, role, organizationId: organization.data.id },
      {
        onSuccess: ({ agentId }) => {
          if (activeRef.current) {
            void openSetup(agentId);
          }
        },
        onError: (error) => {
          submittingRef.current = false;
          if (activeRef.current) {
            toast.error(
              apiErrorMessage(
                error,
                t({
                  id: "studio.createDialog.error",
                  message: "We couldn't create this Digital Worker.",
                }),
              ),
            );
          }
        },
      },
    );
  });

  return (
    <CreateStudioAgentDialogView
      open={open}
      pending={createAgent.isPending || isNavigating}
      canSubmit={rolesState === "ready" && organizationState === "ready"}
      control={form.control}
      roles={roles.data ?? []}
      rolesState={rolesState}
      organizationState={organizationState}
      onOpenChange={onOpenChange}
      onRetryRoles={() => roles.refetch()}
      onRetryOrganization={() => organization.refetch()}
      onSubmit={onSubmit}
    />
  );
}
