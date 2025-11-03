import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: "examples/browser",
  resolve: {
    alias: {
      "yarn-spinner-ts": path.resolve(__dirname, "../src"),
    },
  },
  build: {
    outDir: "../../dist-demo",
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: true,
  },
});

