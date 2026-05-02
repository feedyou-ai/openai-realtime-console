import { join, dirname } from "path";
import { fileURLToPath } from "url";

import viteReact from "@vitejs/plugin-react";

const path = fileURLToPath(import.meta.url);
const projectRoot = dirname(path);
const srcRoot = join(projectRoot, "src");

export default {
  base: 'https://feedyou.blob.core.windows.net/realtime-console',
  root: join(projectRoot, "client"),
  resolve: {
    alias: {
      "@": srcRoot,
    },
  },
  plugins: [viteReact()],
  ssr: {
    external: ["use-sync-external-store"],
  },
};
