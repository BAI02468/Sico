import { createFileRoute } from "@tanstack/react-router";

import { studioTabRouteOptions } from "./-studio-tab-route";

export const Route = createFileRoute("/_authed/studio/created")(
  studioTabRouteOptions("created"),
);
