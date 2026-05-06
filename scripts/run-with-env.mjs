import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const separatorIndex = process.argv.indexOf("--");
const commandArgs = separatorIndex >= 0 ? process.argv.slice(separatorIndex + 1) : process.argv.slice(2);

if (commandArgs.length === 0) {
  console.error("Usage: node scripts/run-with-env.mjs -- <command> [...args]");
  process.exit(1);
}

const env = { ...process.env };

if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([^#][^=]*)=(.*)$/);
    if (!match) continue;

    const key = match[1].trim();
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (env[key] == null) {
      env[key] = value;
    }
  }
}

const [command, ...args] = commandArgs;

const result = spawnSync(command, args, {
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
