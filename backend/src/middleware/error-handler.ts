import type { FastifyError, FastifyInstance } from "fastify";
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from "fastify-type-provider-zod";
import { AppError, type ErrorCode } from "../utils/errors.js";

interface ErrorBody {
  success: false;
  error: { code: ErrorCode; message: string; requestId: string; details?: unknown };
}

// Prisma errors are matched structurally so this module does not depend on the
// generated client.
interface PrismaKnownError {
  name: "PrismaClientKnownRequestError";
  code: string;
}

function isPrismaKnownError(error: unknown): error is PrismaKnownError {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "PrismaClientKnownRequestError" &&
    typeof (error as { code?: unknown }).code === "string"
  );
}

function mapPrismaError(error: PrismaKnownError): AppError | null {
  switch (error.code) {
    case "P2002":
      return new AppError(409, "CONFLICT", "A record with the same unique value already exists.");
    case "P2003":
      return new AppError(409, "CONFLICT", "The operation conflicts with related records.");
    case "P2025":
      return new AppError(404, "NOT_FOUND", "Record not found.");
    default:
      return null;
  }
}

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    const send = (statusCode: number, code: ErrorCode, message: string, details?: unknown) => {
      const body: ErrorBody = {
        success: false,
        error: { code, message, requestId: request.id, ...(details ? { details } : {}) },
      };
      return reply.code(statusCode).send(body);
    };

    if (error instanceof AppError) {
      if (error.statusCode >= 500) request.log.error({ err: error }, error.message);
      return send(error.statusCode, error.code, error.message, error.details);
    }

    if (hasZodFastifySchemaValidationErrors(error)) {
      return send(
        400,
        "VALIDATION_ERROR",
        "The request is invalid.",
        error.validation.map((issue) => ({
          location: error.validationContext,
          path: issue.instancePath || "/",
          message: issue.message,
        })),
      );
    }

    if (isResponseSerializationError(error)) {
      request.log.error(
        { err: error, issues: error.cause.issues },
        "Response serialization failed",
      );
      return send(500, "INTERNAL_ERROR", "An unexpected error occurred.");
    }

    if (isPrismaKnownError(error)) {
      const mapped = mapPrismaError(error);
      if (mapped) return send(mapped.statusCode, mapped.code, mapped.message);
      request.log.error({ prismaCode: error.code }, "Unhandled database error");
      return send(500, "INTERNAL_ERROR", "An unexpected error occurred.");
    }

    // Fastify's own client errors (malformed JSON, payload too large, rate limits...).
    if (typeof error.statusCode === "number" && error.statusCode >= 400 && error.statusCode < 500) {
      const code: ErrorCode =
        error.statusCode === 429
          ? "RATE_LIMITED"
          : error.statusCode === 404
            ? "NOT_FOUND"
            : "BAD_REQUEST";
      return send(error.statusCode, code, error.message);
    }

    // Unknown failure: log the details server-side, return a generic message.
    request.log.error({ err: error }, "Unhandled error");
    return send(500, "INTERNAL_ERROR", "An unexpected error occurred.");
  });

  app.setNotFoundHandler((request, reply) => {
    const body: ErrorBody = {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `Route ${request.method} ${request.url.split("?")[0]} not found.`,
        requestId: request.id,
      },
    };
    return reply.code(404).send(body);
  });
}
