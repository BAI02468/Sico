import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Studio, type StudioTab } from "@sico/shared/features/studio/index.ts";
import type { JSX } from "react";

const STUDIO_TITLE = msg({
  id: "studio.route.title",
  message: "Studio · SICO",
});

type StudioTabRouteOptions = {
  head: () => { meta: [{ title: string }] };
  component: () => JSX.Element;
};

export function studioTabRouteOptions(
  activeTab: StudioTab,
): StudioTabRouteOptions {
  function StudioTabPage(): JSX.Element {
    return <Studio activeTab={activeTab} />;
  }

  return {
    head: () => ({ meta: [{ title: i18n._(STUDIO_TITLE) }] }),
    component: StudioTabPage,
  };
}
