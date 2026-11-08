/// <reference types="vitest" />
import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { configDefaults } from 'vitest/config'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 4000,
    host: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "src/test/setup.ts",
    exclude: [...configDefaults.exclude, "e2e/**"], // Playwright specs; run with `npm run e2e`
    env: { VITE_API_URL: "http://localhost:8000/graphql" },
  },
})
