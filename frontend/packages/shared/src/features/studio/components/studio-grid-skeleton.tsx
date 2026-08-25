import { useLingui } from "@lingui/react/macro";
import type { ReactElement } from "react";

import { StudioCardSkeleton } from "./studio-card-skeleton";
import { CardGrid } from "../../../components/card-grid";

const STUDIO_CARD_SKELETON_IDS = [
  "studio-card-1",
  "studio-card-2",
  "studio-card-3",
  "studio-card-4",
  "studio-card-5",
  "studio-card-6",
] as const;

export function StudioGridSkeleton(): ReactElement {
  const { t } = useLingui();
  return (
    <div
      role="status"
      aria-label={t({
        id: "studio.grid.loading",
        message: "Loading digital workers",
      })}
    >
      <CardGrid>
        {STUDIO_CARD_SKELETON_IDS.map((id) => (
          <StudioCardSkeleton key={id} />
        ))}
      </CardGrid>
    </div>
  );
}
