import * as p from "@clack/prompts";
import { x } from "tinyexec";

import type { PackageManager } from "./args";

export function detectPackageManagerFromUserAgent(): PackageManager {
  const ua = process.env.npm_config_user_agent ?? "";

  if (ua.startsWith("pnpm/")) return "pnpm";
  if (ua.startsWith("yarn/")) return "yarn";
  if (ua.startsWith("bun/")) return "bun";
  if (ua.startsWith("deno/")) return "deno";

  return "npm";
}

export async function isPnpmAvailable() {
  try {
    await x("pnpm", ["--version"], { throwOnError: true });
    return true;
  } catch {
    return false;
  }
}

export async function initGitRepo(dir: string) {
  await x("git", ["init"], {
    throwOnError: false,
    nodeOptions: {
      cwd: dir,
      stdio: "inherit",
    },
  });
}

export async function installDependencies(dir: string, packageManager: PackageManager) {
  const log = p.taskLog({
    title: `Installing dependencies with ${packageManager}...`,
    limit: 5,
    retainLog: false,
  });

  const proc = x(packageManager, ["install"], {
    throwOnError: false,
    nodeOptions: {
      cwd: dir,
    },
  });

  for await (const line of proc) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    log.message(trimmed);
  }

  const result = await proc;

  if (result.exitCode === 0) {
    log.success("Dependencies installed");
    return true;
  }

  log.error(`Dependency installation failed. You can run \`${packageManager} install\` manually.`);
  return false;
}

export function getDevCommand(packageManager: PackageManager) {
  if (packageManager === "npm") return "npm run dev";
  if (packageManager === "deno") return "deno task dev";

  return `${packageManager} dev`;
}
