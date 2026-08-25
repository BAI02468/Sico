import { useLingui } from "@lingui/react/macro";
import type * as React from "react";

import { MessageState } from "../../../components/message-state";
import { EMPTY_ILLUSTRATIONS } from "../../../constants/empty-illustration";
import type { AssetCategory } from "../types";

export type AssetsEmptyProps =
  | { variant: "category"; category: AssetCategory }
  | { variant: "search"; query: string };

// Pick the resolved body line off the discriminated union. Kept as a helper so
// the `variant`→`category`/`query` correlation survives (destructuring `props`
// in the component signature would drop it). Takes already-resolved copy — the
// `t()` calls stay in the component so the extractor still sees them.
function pickBody(
  props: AssetsEmptyProps,
  searchBody: string,
  categoryBody: Record<AssetCategory, string>,
): string {
  return props.variant === "search" ? searchBody : categoryBody[props.category];
}

/**
 * Assets-table empty surface, in two shapes on the shared `MessageState`
 * primitive:
 *
 * - **`category`** — a category has zero rows. The heading is constant (`No
 *   assets yet`) and the body is the category-specific §5 line picked off
 *   `category`.
 * - **`search`** — a search returned nothing. Same heading; the body
 *   interpolates the live `{query}` into the `assets.search.empty` template.
 *
 * Uses the shared `cards` empty illustration. Layout/typography are owned by
 * `MessageState`; this wrapper only feeds illustration key + copy. The copy is
 * resolved inline with the reactive `useLingui().t` so it re-translates on a
 * locale switch and stays statically extractable (a `t` passed to a helper is
 * not recognised by the extractor).
 */
export function AssetsEmpty(props: AssetsEmptyProps): React.JSX.Element {
  const { t } = useLingui();
  // Discriminated-union access — `react/destructuring-assignment` can't model
  // the `variant` narrowing, so the props stay un-destructured (see `pickBody`).
  // eslint-disable-next-line react/destructuring-assignment
  const query = props.variant === "search" ? props.query : "";
  const categoryBody: Record<AssetCategory, string> = {
    all: t({
      id: "projects.assetsEmpty.body.all",
      message:
        "Upload knowledge or wait for your digital workers to produce deliverables.",
    }),
    knowledge: t({
      id: "projects.assetsEmpty.body.knowledge",
      message: "Add knowledge to give this project shared context.",
    }),
    deliverable: t({
      id: "projects.assetsEmpty.body.deliverable",
      message:
        "Deliverables will appear here once your digital workers publish them.",
    }),
    experience: t({
      id: "projects.assetsEmpty.body.experience",
      message:
        "Experiences will appear here as your digital workers learn from tasks.",
    }),
  };
  const searchBody = t({
    id: "projects.assetsEmpty.searchBody",
    message: `No assets match "${query}". Try a different search.`,
  });
  return (
    <MessageState
      illustrationUrl={EMPTY_ILLUSTRATIONS.cards.url}
      illustrationWidth={EMPTY_ILLUSTRATIONS.cards.width}
      illustrationHeight={EMPTY_ILLUSTRATIONS.cards.height}
      heading={t({
        id: "projects.assetsEmpty.heading",
        message: "No assets yet",
      })}
      body={pickBody(props, searchBody, categoryBody)}
    />
  );
}
