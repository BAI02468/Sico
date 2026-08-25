"use strict";

/**
 * Flags a bare `t` macro call (`@lingui/core/macro`) that renders copy in a
 * component which never subscribes to locale changes via `useLingui()`.
 *
 * Why: the bare `t` macro compiles to a one-shot `i18n._()` call. It reads the
 * active locale at render time but does NOT subscribe the component to locale
 * changes. Only `useLingui()` does — it makes the whole component re-render on a
 * locale switch, so every bare `t()` in that component's body (or a helper
 * nested inside it) recomputes. A `<Trans>` element does NOT help: it is an
 * independently-subscribed child that re-renders itself, but it does NOT force
 * its parent component to re-render, so a sibling `copyByKind = { … t() … }`
 * still freezes. That is why this rule treats ONLY `useLingui()` as a
 * subscription — `<Trans>` is irrelevant to the freeze.
 *
 * Detection is scoped PER `t` CALL, not per file — a component can render a
 * `<Trans>` label yet still compute frozen copy with a bare `t()`, and only the
 * latter is a bug. For each bare `t` call the rule walks up to the enclosing
 * functions and reports unless one of them calls `useLingui()`. Limited to
 * `.tsx` — only those render. In `.ts` modules the macro is called imperatively
 * (toast/mutation callbacks, zod schema factories) and evaluates at event time
 * against the then-current locale, so it neither subscribes nor freezes; those
 * files are skipped. Renamed imports (`t as translate`) are tracked so the
 * aliased call counts.
 *
 * Fix: use the hook `t` from `useLingui()` (@lingui/react/macro) for strings
 * you compute into variables/props/aria-label, or render `<Trans>` for static
 * JSX copy (replacing the bare `t()` entirely, not sitting beside it). A
 * module-scope `msg()` catalog never calls bare `t` inside a component and so
 * never trips.
 */

// Walk up the AST from `node` collecting every enclosing function node
// (FunctionDeclaration / FunctionExpression / ArrowFunctionExpression), nearest
// first. A bare `t` call is "subscribed" if any enclosing function subscribes,
// so a helper inside a subscribed component still counts.
function enclosingFunctions(node) {
  const fns = [];
  let cur = node.parent;
  while (cur) {
    if (
      cur.type === "FunctionDeclaration" ||
      cur.type === "FunctionExpression" ||
      cur.type === "ArrowFunctionExpression"
    ) {
      fns.push(cur);
    }
    cur = cur.parent;
  }
  return fns;
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Flag bare `t` macro calls from @lingui/core/macro that render copy in a component not subscribed to locale via useLingui() or <Trans>, which freezes copy on the render-time locale and skips runtime language switches.",
      category: "Best Practices",
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      unsubscribedBareT:
        "Bare `t` macro does not re-render on locale change — copy freezes on the render-time language. Use useLingui()'s `t` from @lingui/react/macro, or render <Trans>.",
    },
  },
  create(context) {
    // Only `.tsx` files render — the "freeze on render-time locale" bug is a
    // rendering-path problem. In `.ts` modules the bare `t` macro is called
    // imperatively (toast/mutation callbacks, zod schema factories): it
    // evaluates at the moment the event fires, reading the then-current locale,
    // so there is nothing to subscribe and nothing to freeze. Skip them.
    if (!context.filename.endsWith(".tsx")) {
      return {};
    }

    // The local name(s) `t` is imported under from @lingui/core/macro.
    const bareTNames = new Set();
    // Each bare `t` call site (CallExpression / TaggedTemplateExpression node).
    const bareTCalls = [];
    // Function nodes that subscribe via a `useLingui()` call (recorded as the
    // set of their enclosing functions).
    const subscribingFns = new Set();
    // Whether a `useLingui()` appears at module scope (outside any function) —
    // rare, but then everything below is subscribed.
    let moduleScopeSubscribes = false;

    function markSubscribed(node) {
      const fns = enclosingFunctions(node);
      if (fns.length === 0) {
        moduleScopeSubscribes = true;
        return;
      }
      for (const fn of fns) {
        subscribingFns.add(fn);
      }
    }

    return {
      ImportDeclaration(node) {
        if (node.source.value !== "@lingui/core/macro") {
          return;
        }
        for (const spec of node.specifiers) {
          if (spec.type === "ImportSpecifier" && spec.imported.name === "t") {
            bareTNames.add(spec.local.name);
          }
        }
      },

      // A `useLingui(...)` call subscribes its enclosing function(s). Only this
      // re-renders the whole component; `<Trans>` does not, so it is ignored.
      "CallExpression[callee.name='useLingui']"(node) {
        markSubscribed(node);
      },

      // A call to the bare-`t` binding: `t(...)` or `translate(...)`.
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          bareTNames.has(node.callee.name)
        ) {
          bareTCalls.push(node);
        }
      },

      // A tagged-template call: `t`...`` or `translate`...``.
      TaggedTemplateExpression(node) {
        if (node.tag.type === "Identifier" && bareTNames.has(node.tag.name)) {
          bareTCalls.push(node);
        }
      },

      "Program:exit"() {
        if (moduleScopeSubscribes) {
          return;
        }
        for (const call of bareTCalls) {
          const fns = enclosingFunctions(call);
          const subscribed = fns.some((fn) => subscribingFns.has(fn));
          if (!subscribed) {
            context.report({ node: call, messageId: "unsubscribedBareT" });
          }
        }
      },
    };
  },
};
