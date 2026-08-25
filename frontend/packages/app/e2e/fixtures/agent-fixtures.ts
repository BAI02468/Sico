import { type Page } from "@playwright/test";
import { makeOkEnvelope } from "@sico/shared/schemas/api.ts";

// Shared digital-worker / chat fixtures. `makeAgent` + the two mock helpers were
// copy-pasted across dw-list / dw-home / dw-collaboration / project-sandbox;
// centralised here (mirroring `project-fixtures.ts`) so the endpoint-anchoring
// regexes never drift between copies.

export type AgentFixture = {
  id: number;
  name: string;
  role: string;
  iconUri: string;
  status: number;
};

export function makeAgent(id: number, name: string): AgentFixture {
  return { id, name, role: "Role", iconUri: "", status: 3 };
}

// Detail (singular) endpoint only. A trailing-`*` glob (`single_agent_instance*`)
// would ALSO swallow the sidebar's plural `single_agent_instances?…` list call,
// so match the literal `?` query delimiter — present on the detail GET, absent
// right after the plural's `…instances`. `handler` lets a test pick its own
// status/body (e.g. a 500); it defaults to a 200 with the given agent.
export async function mockAgentDetail(
  page: Page,
  handler: () => { status?: number; body: unknown } = () => ({
    body: makeOkEnvelope({ instance: makeAgent(5, "Chloe") }),
  }),
): Promise<void> {
  await page.route(
    /\/api\/sico\/agent\/single_agent_instance\?/,
    async (route) => {
      const { status = 200, body } = handler();
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    },
  );
}

// One history-page item (newest-first). `content` is optional so a pointer-only
// row (e.g. a PLAN turn) can omit it.
export type HistoryItem = {
  messageId: number;
  turnId: number;
  role: "user" | "assistant";
  type: number;
  content?: string;
};

// Stub one `GET /conversation/messages` page (no older pages). Defaults to an
// empty page so the collaboration composer mounts instead of throwing the
// history schema error to the ErrorBoundary.
export async function mockHistory(
  page: Page,
  items: HistoryItem[] = [],
): Promise<void> {
  await page.route(/\/conversation\/messages\?/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(makeOkEnvelope({ messages: items, hasMore: false })),
    });
  });
}
