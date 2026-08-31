import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// Frontend-only dev server. The Bun API server (src/server/index.ts) keeps
// serving /rpc, /ws and /health on its own port; Vite proxies those through
// so the client can keep using same-origin URLs (see src/client/rpc/client.ts).
const apiTarget = `http://localhost:${process.env.API_PORT ?? 3030}`

export default defineConfig({
  root: "src",
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), react()],
  server: {
    port: Number(process.env.PORT ?? 3000),
    proxy: {
      "/rpc": apiTarget,
      "/health": apiTarget,
      "/ws": { target: apiTarget, ws: true },
    },
  },
})
