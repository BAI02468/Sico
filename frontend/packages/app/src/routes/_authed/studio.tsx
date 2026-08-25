import { StudioLayout } from "@sico/shared/features/studio/index.ts";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { type JSX } from "react";

export const Route = createFileRoute("/_authed/studio")({
  component: StudioRoute,
  staticData: { workspaceMode: "developer" },
});

function StudioRoute(): JSX.Element {
  return (
    <StudioLayout>
      <Outlet />
    </StudioLayout>
  );
}
