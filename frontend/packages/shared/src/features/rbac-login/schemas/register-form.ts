// Bounds (email 3..64, password 8..128) mirror the backend registration
// `binding` tags — keep in sync. Custom messages here go straight to the user
// via <FieldError>; keep them friendly + actionable.
import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { z } from "zod";

// Module-scope `msg()` descriptors: `msg` is a lingui macro (statically
// extractable) that only *defines* the message — it never calls the runtime, so
// importing this module can't run `i18n._()` before a locale is active. The
// error text is resolved lazily via zod v4's `error` callback, which fires at
// validation time (locale already active) and re-reads the active locale on
// every check — no freeze, no factory, no injected `t`.
const EMAIL_REQUIRED = msg({
  id: "rbacLogin.register.email.required",
  message: "Please enter your email",
});
const EMAIL_INVALID = msg({
  id: "rbacLogin.register.email.invalid",
  message: "Please enter a valid email",
});
const EMAIL_MAX = msg({
  id: "rbacLogin.register.email.max",
  message: "Email must be 64 characters or fewer",
});
const PASSWORD_REQUIRED = msg({
  id: "rbacLogin.register.password.required",
  message: "Please create a password",
});
const PASSWORD_MIN = msg({
  id: "rbacLogin.register.password.min",
  message: "Password must be at least 8 characters",
});
const PASSWORD_MAX = msg({
  id: "rbacLogin.register.password.max",
  message: "Password must be 128 characters or fewer",
});

export const registerFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { error: () => i18n._(EMAIL_REQUIRED) })
    .min(3, { error: () => i18n._(EMAIL_INVALID) })
    .max(64, { error: () => i18n._(EMAIL_MAX) })
    .email({ error: () => i18n._(EMAIL_INVALID) }),
  password: z
    .string()
    .min(1, { error: () => i18n._(PASSWORD_REQUIRED) })
    .min(8, { error: () => i18n._(PASSWORD_MIN) })
    .max(128, { error: () => i18n._(PASSWORD_MAX) }),
});

export type RegisterFormValues = z.infer<typeof registerFormSchema>;
