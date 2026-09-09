/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Local development ports sit in the same 11802-11900 block as the deployed stack
// but are deliberately distinct from it, so `npm run dev` and `docker compose up`
// can run side by side without fighting over a port.
const DEV_PORT = Number(process.env.FRONTEND_DEV_PORT) || 11812;
const DEV_API_PORT = Number(process.env.BACKEND_DEV_PORT) || 11813;
const DEV_API = `http://localhost:${DEV_API_PORT}`;

// Bind to 0.0.0.0 so other computers on the office LAN can reach the dev server too.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../shared")
    }
  },
  server: {
    host: "0.0.0.0",
    port: DEV_PORT,
    // The app calls the API at the relative path /api. In production nginx proxies
    // that to the backend; in development this proxy stands in for nginx so both
    // environments behave identically.
    proxy: {
      "/api": { target: DEV_API, changeOrigin: true },
      "/socket.io": { target: DEV_API, ws: true, changeOrigin: true }
    },
    // Allow importing the sibling shared/ types folder outside the project root.
    fs: { allow: [path.resolve(__dirname, ".."), __dirname] }
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts"
  }
});
