import { AppError } from "../../network/errors/appError";
export function scenarioErrorMessage(error: unknown): string {
  if (!(error instanceof AppError))
    return "We could not check case-study availability. Please try again.";
  if (error.kind === "network")
    return "We could not reach SURIMI. Please check your connection and try again.";
  if (error.kind === "forbidden")
    return "Your account cannot access these case studies. Please contact your administrator.";
  if (error.kind === "invalidResponse")
    return "The case-study response could not be read. Please try again or contact the team.";
  if (error.kind === "rateLimited")
    return "Too many requests. Please wait before checking again.";
  if (error.kind === "server")
    return "The simulation service is temporarily unavailable. Please try again.";
  return "We could not check case-study availability. Please try again.";
}
