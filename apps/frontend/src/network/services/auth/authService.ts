import request, { refreshSession } from "../../request";
import {
  authProvidersSchema,
  emptyResponseSchema,
  loginPayloadSchema,
  passwordChangePayloadSchema,
  userSchema,
  type LoginPayload,
  type PasswordChangePayload,
} from "./authSchemas";

const authService = {
  me: (signal?: AbortSignal) => request({
    path: "/auth/me", method: "GET", responseSchema: userSchema, signal,
  }),
  providers: (signal?: AbortSignal) => request({
    path: "/auth/providers", method: "GET", auth: "public",
    responseSchema: authProvidersSchema, signal,
  }),
  login: (payload: LoginPayload) => request({
    path: "/auth/login", method: "POST", auth: "public",
    payloadSchema: loginPayloadSchema, payload, responseSchema: userSchema,
  }),
  logout: () => request({
    path: "/auth/logout", method: "POST", responseSchema: emptyResponseSchema,
  }),
  changePassword: (payload: PasswordChangePayload) => request({
    path: "/auth/password", method: "POST",
    payloadSchema: passwordChangePayloadSchema, payload, responseSchema: emptyResponseSchema,
  }),
  refresh: refreshSession,
};

// SSO starts with browser navigation to a provider.login_url, not an HTTP fetch.
export default authService;
