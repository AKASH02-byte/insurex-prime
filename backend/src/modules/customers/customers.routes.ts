import { z } from "zod";
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
  createCustomerBodySchema,
  customerDetailSchema,
  customerIdParamsSchema,
  customerSchema,
  listCustomersQuerySchema,
  updateCustomerBodySchema,
} from "./customers.schemas.js";
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
} from "./customers.service.js";

const security = [{ bearerAuth: [] }];
const tags = ["Customers"];

export const customerRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get(
    "",
    {
      schema: {
        tags,
        security,
        summary: "List customers",
        description:
          "SUPER_ADMIN sees all customers; AGENT sees only their own. Search matches name, customer code, phone and email. Date range filters `createdAt`.",
        querystring: listCustomersQuerySchema,
        response: { 200: paginatedSchema(customerSchema), ...errorResponses },
      },
    },
    async (request) => {
      const { items, meta } = await listCustomers(request.db, requireAuth(request), request.query);
      return paginated(items, meta);
    },
  );

  app.get(
    "/:id",
    {
      schema: {
        tags,
        security,
        summary: "Get a customer with their policies",
        params: customerIdParamsSchema,
        response: { 200: successSchema(customerDetailSchema), ...errorResponses },
      },
    },
    async (request) => ok(await getCustomer(request.db, requireAuth(request), request.params.id)),
  );

  app.post(
    "",
    {
      schema: {
        tags,
        security,
        summary: "Create a customer",
        description: "When called by an AGENT the customer is always assigned to that agent.",
        body: createCustomerBodySchema,
        response: { 201: successSchema(customerSchema), ...errorResponses },
      },
    },
    async (request, reply) =>
      reply
        .code(201)
        .send(ok(await createCustomer(request.db, requireAuth(request), request, request.body))),
  );

  app.patch(
    "/:id",
    {
      schema: {
        tags,
        security,
        summary: "Update a customer",
        description: "Agents can update only their own customers and cannot reassign them.",
        params: customerIdParamsSchema,
        body: updateCustomerBodySchema,
        response: { 200: successSchema(customerSchema), ...errorResponses },
      },
    },
    async (request) =>
      ok(
        await updateCustomer(
          request.db,
          requireAuth(request),
          request,
          request.params.id,
          request.body,
        ),
      ),
  );

  app.delete(
    "/:id",
    {
      schema: {
        tags,
        security,
        summary: "Delete a customer",
        description: "Returns 409 if the customer has sold policies.",
        params: customerIdParamsSchema,
        response: { 200: successSchema(z.object({ id: z.uuid() })), ...errorResponses },
      },
    },
    async (request) => {
      await deleteCustomer(request.db, requireAuth(request), request, request.params.id);
      return ok({ id: request.params.id });
    },
  );
};
