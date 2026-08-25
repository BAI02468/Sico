import { createFileRoute, Outlet } from "@tanstack/react-router";
import { type JSX } from "react";

export const Route = createFileRoute("/_authed/project")({
  component: ProjectLayout,
});

function ProjectLayout(): JSX.Element {
  return <Outlet />;
}
