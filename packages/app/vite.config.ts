import { defineConfig } from "vite";
import raskPlugin from "rask-ui/plugin";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [tailwindcss(), raskPlugin()],
  envDir: path.resolve(__dirname, "../../"),
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 5173,
    strictPort: false,
  },
});
