import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { readFile } from "fs/promises";

import viteReact from "@vitejs/plugin-react";
import viteFastifyReact from "@fastify/react/plugin";
import { transformWithEsbuild } from "vite";

const path = fileURLToPath(import.meta.url);
const projectRoot = dirname(path);
const srcRoot = join(projectRoot, "src");

function transformSrcTsxBeforeFastify() {
  return {
    name: "transform-src-tsx-before-fastify",
    async load(id) {
      if (!id.startsWith(srcRoot) || !id.endsWith(".tsx")) return null;

      const source = await readFile(id, "utf8");
      return transformWithEsbuild(source, id, {
        loader: "tsx",
        jsx: "automatic",
      });
    },
  };
}

export default {
  base: 'https://feedyou.blob.core.windows.net/realtime-console',
  root: join(projectRoot, "client"),
  resolve: {
    alias: {
      "@": srcRoot,
    },
  },
  plugins: [viteReact(), transformSrcTsxBeforeFastify(), viteFastifyReact()],
  ssr: {
    external: ["use-sync-external-store"],
  },
};
