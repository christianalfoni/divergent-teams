import { defineConfig } from "vite";
import raskPlugin from "rask-ui/plugin";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), raskPlugin()],
});
