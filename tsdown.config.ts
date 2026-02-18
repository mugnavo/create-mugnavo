import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/index.ts",
  platform: "node",
  target: "node24",
  minify: true,
  dts: false,
  sourcemap: false,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
