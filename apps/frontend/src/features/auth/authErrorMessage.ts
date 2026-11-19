import { AppError } from "../../network/errors/appError";

export const authErrorMessage = (error: unknown): string => {
  if (!(error instanceof AppError)) return "Something went wrong. Please try again.";
  if (error.code === "invalid_credentials") return "The username, email or password is incorrect.";
  if (error.code === "account_inactive") return "Your account is inactive. Please contact your administrator.";
  if (error.kind === "rateLimited") return "Too many sign-in attempts. Please wait before trying again.";
  if (error.kind === "network" || error.kind === "server") return "SURIMI is currently unavailable. Please try again shortly.";
  if (error.kind === "payloadValidation") return "Please enter your username or email and password.";
  if (error.kind === "invalidResponse") return "We could not verify the response from SURIMI. Please try again.";
  return error.message;
};
