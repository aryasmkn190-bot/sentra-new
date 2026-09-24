import { cache } from "react";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

if (typeof WebSocket === "undefined") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ws = require("ws");
    neonConfig.webSocketConstructor = ws;
  } catch {
    // In Edge / Cloudflare Workers, native global WebSocket is present.
  }
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined in environment variables");
  }

  const adapter = new PrismaNeon(
    { connectionString },
    { schema: "sentra" }
  );

  return new PrismaClient({ adapter });
}

// In Next.js, cache() scopes the client per-request so Cloudflare Workers
// isolate never shares WebSocket streams across different HTTP requests.
const getRequestClient = cache(() => createPrismaClient());

export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    let client: PrismaClient;
    try {
      client = getRequestClient();
    } catch {
      client = createPrismaClient();
    }
    const val = Reflect.get(client, prop);
    return typeof val === "function" ? val.bind(client) : val;
  },
});
