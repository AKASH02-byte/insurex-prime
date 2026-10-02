import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { IncomingMessage } from "node:http";

export const REQUEST_ID_HEADER = "x-request-id";
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{8,128}$/;

/**
 * Reuses an inbound X-Request-Id (e.g. from a proxy) only when it is a safe token,
 * so arbitrary header content never reaches logs or responses.
 */
export function genReqId(req: IncomingMessage): string {
  const incoming = req.headers[REQUEST_ID_HEADER];
  if (typeof incoming === "string" && SAFE_REQUEST_ID.test(incoming)) return incoming;
  return randomUUID();
}

export function registerRequestIdHeader(app: FastifyInstance) {
  app.addHook("onRequest", async (request, reply) => {
    reply.header(REQUEST_ID_HEADER, request.id);
  });
}
