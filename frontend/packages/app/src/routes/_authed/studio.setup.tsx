import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { rolesQueryOptions } from "@sico/shared/features/skill/index.ts";
import { CreateSetupPage } from "@sico/shared/features/studio/index.ts";
import { createFileRoute } from "@tanstack/react-router";

const CREATE_DIGITAL_WORKER_TITLE = msg({
  id: "studio.setup.route.title",
  message: "Create Digital Worker · SICO",
});

// Create-mode setup (no agentId). The page body lives in @sico/shared
// (CreateSetupPage); this route owns only the roles prefetch and metadata.
export const Route = createFileRoute("/_authed/studio/setup")({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(
      rolesQueryOptions(context.apiClient),
    );
  },
  head: () => ({ meta: [{ title: i18n._(CREATE_DIGITAL_WORKER_TITLE) }] }),
  component: CreateSetupPage,
});
