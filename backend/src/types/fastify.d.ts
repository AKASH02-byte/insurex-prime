import "fastify";
import type { Env } from "../config/env.js";
import type { Database } from "../config/database.js";

declare module "fastify" {
  interface FastifyInstance {
    config: Env;
    db: Database;
  }
}
