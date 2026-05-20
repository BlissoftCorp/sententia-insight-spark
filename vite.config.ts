// @lovable.dev/vite-tanstack-config bundles tanstackStart, viteReact, tailwindcss,
// tsConfigPaths, dev tooling, env injection, alias, dedupe, error loggers, sandbox
// detection. We disable the Cloudflare plugin so `vite build` emits a generic SSR
// bundle (dist/server/server.js) that Bun.serve can run directly on the VPS.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    server: { entry: "server" },
  },
});
