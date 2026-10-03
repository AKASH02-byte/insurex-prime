import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { requireAuth, tenantAdminOnly } from "../../middleware/role.js";
import { errorResponses, ok, successSchema } from "../../utils/response.js";
import { z } from "zod";
import {
  catalogTreeQuerySchema,
  catalogTreeSchema,
  categoryIdParamsSchema,
  categorySchema,
  createCategoryBodySchema,
  listCategoriesQuerySchema,
  updateCategoryBodySchema,
} from "./catalog.schemas.js";
import {
  createCategory,
  deleteCategory,
  getCatalogTree,
  listCategories,
  updateCategory,
} from "./catalog.service.js";

const security = [{ bearerAuth: [] }];
const tags = ["Catalog"];

/**
 * The tenant's own catalog (line → category → sub-category → policy). Everything here is
 * restricted to the caller's tenant; agents fill their dropdowns from these endpoints.
 */
export const catalogRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get(
    "/tree",
    {
      schema: {
        tags,
        security,
        summary: "The tenant's catalog tree for cascading dropdowns",
        description:
          "Lines of business that have content, each with categories, sub-categories and policies. AGENT callers only receive ACTIVE policies.",
        querystring: catalogTreeQuerySchema,
        response: { 200: successSchema(catalogTreeSchema), ...errorResponses },
      },
    },
    async (request) => ok(await getCatalogTree(request.db, requireAuth(request), request.query)),
  );

  app.get(
    "/categories",
    {
      schema: {
        tags,
        security,
        summary: "List categories (flat)",
        querystring: listCategoriesQuerySchema,
        response: { 200: successSchema(z.array(categorySchema)), ...errorResponses },
      },
    },
    async (request) => ok(await listCategories(request.db, request.query)),
  );

  app.post(
    "/categories",
    {
      preHandler: tenantAdminOnly,
      schema: {
        tags,
        security,
        summary: "Create a category or sub-category (tenant admin)",
        description: "Nesting is limited to category → sub-category.",
        body: createCategoryBodySchema,
        response: { 201: successSchema(categorySchema), ...errorResponses },
      },
    },
    async (request, reply) =>
      reply
        .code(201)
        .send(ok(await createCategory(request.db, requireAuth(request), request, request.body))),
  );

  app.patch(
    "/categories/:id",
    {
      preHandler: tenantAdminOnly,
      schema: {
        tags,
        security,
        summary: "Rename or reorder a category (tenant admin)",
        params: categoryIdParamsSchema,
        body: updateCategoryBodySchema,
        response: { 200: successSchema(categorySchema), ...errorResponses },
      },
    },
    async (request) =>
      ok(await updateCategory(request.db, request, request.params.id, request.body)),
  );

  app.delete(
    "/categories/:id",
    {
      preHandler: tenantAdminOnly,
      schema: {
        tags,
        security,
        summary: "Delete an empty category (tenant admin)",
        params: categoryIdParamsSchema,
        response: { 200: successSchema(z.object({ id: z.uuid() })), ...errorResponses },
      },
    },
    async (request) => {
      await deleteCategory(request.db, request, request.params.id);
      return ok({ id: request.params.id });
    },
  );
};
