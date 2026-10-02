export type ErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "TOKEN_EXPIRED"
  | "INVALID_TOKEN"
  | "FORBIDDEN"
  | "ACCOUNT_NOT_PROVISIONED"
  | "ACCOUNT_DISABLED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR";

/** An error whose code and message are safe to return to API clients. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, "BAD_REQUEST", message, details);
export const unauthenticated = (message = "Authentication is required.") =>
  new AppError(401, "UNAUTHENTICATED", message);
export const forbidden = (message = "You do not have permission to perform this action.") =>
  new AppError(403, "FORBIDDEN", message);
export const notFound = (entity: string) => new AppError(404, "NOT_FOUND", `${entity} not found.`);
export const conflict = (message: string) => new AppError(409, "CONFLICT", message);
