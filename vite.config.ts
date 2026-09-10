import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Vite owns the client bundle in both dev and production. In dev it serves the
// frontend and proxies /rpc, /ws and /health to the Bun API server
// (src/server/index.ts) so the client can keep using same-origin URLs (see
// src/client/rpc/client.ts); `vite build` emits dist/, which that same Bun
// server serves in production.
const apiTarget = `http://localhost:${process.env.API_PORT ?? 3030}`;

export default defineConfig({
	root: 'src',
	resolve: { tsconfigPaths: true },
	plugins: [tailwindcss(), react()],
	// `outDir` resolves against `root`, so this lands at the repo's dist/.
	build: { outDir: '../dist', emptyOutDir: true },
	// Dev always serves workers as ESM while the build defaults to iife; pinning
	// "es" keeps Monaco's SQL worker behaving the same in both.
	worker: { format: 'es' },
	server: {
		port: Number(process.env.PORT ?? 3000),
		proxy: {
			'/rpc': apiTarget,
			'/health': apiTarget,
			'/ws': { target: apiTarget, ws: true }
		}
	}
});
