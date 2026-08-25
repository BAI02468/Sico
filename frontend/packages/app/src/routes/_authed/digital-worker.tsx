import { createFileRoute, Outlet } from "@tanstack/react-router";
import { type JSX } from "react";

export const Route = createFileRoute("/_authed/digital-worker")({
  component: DigitalWorkerLayout,
});

function DigitalWorkerLayout(): JSX.Element {
  return <Outlet />;
}
