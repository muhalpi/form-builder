import { spawnSync } from "node:child_process";

process.env.NODE_ENV = "development";

const build = spawnSync(process.execPath, ["./build.mjs"], {
  env: process.env,
  stdio: "inherit",
});

if (build.status) {
  process.exit(build.status);
}

const start = spawnSync(process.execPath, ["--enable-source-maps", "./dist/index.mjs"], {
  env: process.env,
  stdio: "inherit",
});

process.exit(start.status ?? 0);
