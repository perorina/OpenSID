import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss(), inlineEntryCss()],
});

function inlineEntryCss(): Plugin {
  return {
    name: "inline-entry-css",
    apply: "build",
    enforce: "post",
    generateBundle(_, bundle) {
      const html = bundle["index.html"];
      if (!html || html.type !== "asset" || typeof html.source !== "string") return;

      const cssFiles = Object.entries(bundle).filter((entry): entry is [string, Extract<(typeof bundle)[string], { type: "asset" }>] => {
        const [, asset] = entry;
        return asset.type === "asset" && asset.fileName.endsWith(".css") && typeof asset.source === "string";
      });
      if (!cssFiles.length) return;

      const css = cssFiles.map(([, asset]) => asset.source).join("\n");
      let source = html.source;
      for (const [, asset] of cssFiles) {
        const escaped = asset.fileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        source = source.replace(new RegExp(`<link[^>]+href="/${escaped}"[^>]*>\\s*`, "g"), "");
        delete bundle[asset.fileName];
      }

      html.source = source.replace("</head>", `<style>${css}</style></head>`);
    },
  };
}
