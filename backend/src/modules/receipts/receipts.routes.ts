import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { requireAuth } from "../../middleware/role.js";
import {
  errorResponses,
  ok,
  paginated,
  paginatedSchema,
  successSchema,
} from "../../utils/response.js";
import {
  createReceiptBodySchema,
  listReceiptsQuerySchema,
  receiptIdParamsSchema,
  receiptSchema,
} from "./receipts.schemas.js";
import { createReceipt, getReceipt, listReceipts } from "./receipts.service.js";

const security = [{ bearerAuth: [] }];
const tags = ["Receipts"];

export const receiptRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get(
    "",
    {
      schema: {
        tags,
        security,
        summary: "List receipts",
        description:
          "AGENT callers see only receipts for their own sales. Search matches receipt number, policy number and customer name. Date range filters `issuedAt`.",
        querystring: listReceiptsQuerySchema,
        response: { 200: paginatedSchema(receiptSchema), ...errorResponses },
      },
    },
    async (request) => {
      const { items, meta } = await listReceipts(request.db, requireAuth(request), request.query);
      return paginated(items, meta);
    },
  );

  app.get(
    "/:id",
    {
      schema: {
        tags,
        security,
        summary: "Get a receipt",
        params: receiptIdParamsSchema,
        response: { 200: successSchema(receiptSchema), ...errorResponses },
      },
    },
    async (request) => ok(await getReceipt(request.db, requireAuth(request), request.params.id)),
  );

  app.post(
    "",
    {
      schema: {
        tags,
        security,
        summary: "Record a payment receipt",
        description:
          "AGENT callers can add receipts only to their own sales. PAID receipts cannot exceed the outstanding premium; when fully paid the sale becomes PAID and a PENDING policy becomes ACTIVE.",
        body: createReceiptBodySchema,
        response: { 201: successSchema(receiptSchema), ...errorResponses },
      },
    },
    async (request, reply) =>
      reply
        .code(201)
        .send(ok(await createReceipt(request.db, requireAuth(request), request, request.body))),
  );
};
