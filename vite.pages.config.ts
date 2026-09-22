import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/** Static client build for GitHub Pages. Dev preview keeps using vite.config.ts. */
export default defineConfig({
  base: "https://cdn.jsdelivr.net/gh/jbirney01-code/snakes-and-ladders-slots@gh-pages/",
  plugins: [
    tailwindcss(),
    tanstackStart({
      spa: { enabled: true },
    }),
    viteReact(),
  ],
});
