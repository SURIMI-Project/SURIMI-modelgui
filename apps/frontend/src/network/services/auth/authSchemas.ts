import { z } from "zod";

// Matches UserOut, not an OIDC provider's raw claims.
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  username: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  display_name: z.string(),
  account: z.enum(["local", "sso"]),
  role: z.enum(["admin", "member"]),
  role_source: z.enum(["local", "idp"]),
  is_active: z.boolean(),
  must_change_password: z.boolean(),
  has_password: z.boolean(),
  last_login_at: z.string().datetime({ offset: true }).nullable(),
  login_count: z.number().int().nonnegative(),
  created_at: z.string().datetime({ offset: true }),
});
export const loginPayloadSchema = z.object({
  login: z.string().min(1).max(320),
  // Do not apply new-password rules to an existing user's password.
  password: z.string().min(1),
});
export const passwordChangePayloadSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(12).max(256),
});
export const authProviderSchema = z.object({
  key: z.string(),
  display_name: z.string(),
  login_url: z.string().startsWith("/api/v1/auth/sso/"),
});
export const authProvidersSchema = z.array(authProviderSchema);
export const emptyResponseSchema = z.void();

export type User = z.output<typeof userSchema>;
export type LoginPayload = z.input<typeof loginPayloadSchema>;
export type PasswordChangePayload = z.input<typeof passwordChangePayloadSchema>;
export type AuthProvider = z.output<typeof authProviderSchema>;
