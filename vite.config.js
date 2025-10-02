import { join, dirname } from "path";
import { fileURLToPath } from "url";

import viteReact from "@vitejs/plugin-react";
import viteFastifyReact from "@fastify/react/plugin";

const path = fileURLToPath(import.meta.url);

export default {
  base: 'https://feedyou.blob.core.windows.net/realtime-console',
  root: join(dirname(path), "client"),
  plugins: [viteReact(), viteFastifyReact()],
  ssr: {
    external: ["use-sync-external-store"],
  },
};
