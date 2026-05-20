// Bun launcher for the production SSR bundle.
// Run with: bun run scripts/start.ts (after `bun run build`).
// Reads PORT and HOST from env (defaults: 3001 / 127.0.0.1).

import handler from "../dist/server/server.js";

const port = Number(process.env.PORT ?? 3001);
const hostname = process.env.HOST ?? "127.0.0.1";

// @ts-expect-error — Bun global is available in the Bun runtime.
Bun.serve({
  port,
  hostname,
  fetch: (req: Request) =>
    (handler as { fetch: (r: Request, env: unknown, ctx: unknown) => Promise<Response> | Response })
      .fetch(req, process.env, {}),
});

console.log(`[dashboard] listening on http://${hostname}:${port}`);
