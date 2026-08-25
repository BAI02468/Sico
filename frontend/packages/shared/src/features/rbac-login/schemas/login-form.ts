// Bounds (email 3..64, password 6..128) mirror backend `binding` tags in
// `internal/transport/http/dto/rbac/token/token.pb.go` — keep in sync.
// Custom messages here go straight to the user via <FieldError>;
// keep them friendly + actionable.
import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { z } from "zod";

// Module-scope `msg()` descriptors: `msg` is a lingui macro (statically
// extractable) that only *defines* the message — it never calls the runtime, so
// importing this module can't run `i18n._()` before a locale is active. The
// error text is resolved lazily via zod v4's `error` callback, which fires at
// validation time (locale already active) and re-reads the active locale on
// every check — no freeze, no factory, no injected `t`.
const EMAIL_MIN = msg({
  id: "rbacLogin.email.min",
  message: "Email must be at least 3 characters",
});
const EMAIL_MAX = msg({
  id: "rbacLogin.email.max",
  message: "Email must be 64 characters or fewer",
});
const EMAIL_INVALID = msg({
  id: "rbacLogin.email.invalid",
  message: "Please enter a valid email",
});
const PASSWORD_MIN = msg({
  id: "rbacLogin.password.min",
  message: "Password must be at least 6 characters",
});
const PASSWORD_MAX = msg({
  id: "rbacLogin.password.max",
  message: "Password must be 128 characters or fewer",
});

export const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(3, { error: () => i18n._(EMAIL_MIN) })
    .max(64, { error: () => i18n._(EMAIL_MAX) })
    .email({ error: () => i18n._(EMAIL_INVALID) }),
  // No `.trim()` — leading / trailing space may be part of the secret.
  password: z
    .string()
    .min(6, { error: () => i18n._(PASSWORD_MIN) })
    .max(128, { error: () => i18n._(PASSWORD_MAX) }),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
