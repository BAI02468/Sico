import { useLingui } from "@lingui/react/macro";
import { Tabs, TabsList, TabsTrigger } from "@sico/ui";
import { Link } from "@tanstack/react-router";
import { type ReactElement } from "react";

import { type StudioTab } from "../utils/studio-agent-selectors";

const STUDIO_TABS: readonly { value: StudioTab; to: string }[] = [
  { value: "all", to: "/studio/all" },
  { value: "created", to: "/studio/created" },
  { value: "editable", to: "/studio/editable" },
];

type Props = {
  readonly activeTab: StudioTab;
};

export function StudioTabs({ activeTab }: Props): ReactElement {
  const { t } = useLingui();
  const labels: Record<StudioTab, string> = {
    all: t({ id: "studio.tabs.all", message: "All" }),
    created: t({ id: "studio.tabs.created", message: "Created" }),
    editable: t({ id: "studio.tabs.editable", message: "Editable" }),
  };
  return (
    <Tabs value={activeTab}>
      <TabsList variant="pill">
        {STUDIO_TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            nativeButton={false}
            render={<Link to={tab.to} />}
          >
            {labels[tab.value]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
