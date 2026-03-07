import { constants } from "node:fs";
import { copyFile, rm } from "node:fs/promises";
import { join } from "node:path";

import * as p from "@clack/prompts";
import { defineCommand, runMain } from "citty";
import { downloadTemplate } from "giget";
import { x } from "tinyexec";

type PackageManager = "pnpm" | "npm" | "bun" | "yarn" | "deno";

function detectPackageManagerFromUserAgent(): PackageManager {
  const ua = process.env.npm_config_user_agent ?? "";

  if (ua.startsWith("pnpm/")) return "pnpm";
  if (ua.startsWith("yarn/")) return "yarn";
  if (ua.startsWith("bun/")) return "bun";
  if (ua.startsWith("deno/")) return "deno";

  return "npm";
}

async function isPnpmAvailable() {
  try {
    await x("pnpm", ["--version"], { throwOnError: true });
    return true;
  } catch {
    return false;
  }
}

const main = defineCommand({
  meta: {
    name: "create-mugnavo",
    version: "0.1.2",
  },
  args: {
    name: {
      type: "positional",
      description: "Project name",
      required: false,
    },
    template: {
      type: "enum",
      description: "TanStarter template to use",
      options: ["default", "monorepo"],
      required: false,
      alias: ["t"],
    },
    install: {
      type: "boolean",
      description: "Install dependencies",
      required: false,
      alias: ["i"],
    },
    packageManager: {
      type: "enum",
      description: "Package manager to use",
      options: ["pnpm", "npm", "bun", "yarn"],
      required: false,
      alias: ["p"],
    },
  },
  async run({ args }) {
    let projectName = args.name as typeof args.name | symbol;
    let template = args.template as typeof args.template | symbol;
    let install = args.install as typeof args.install | symbol;
    let selectedPackageManager = args.packageManager as PackageManager | symbol | undefined;

    const preferredPackageManager = (await isPnpmAvailable())
      ? "pnpm"
      : detectPackageManagerFromUserAgent();

    if (!projectName) {
      projectName = await p.text({
        message: "Project name?",
        placeholder: "my-project",
        defaultValue: "my-project",
        validate(value) {
          if (value && value.includes(" ")) return "Project name cannot contain spaces";
          return undefined;
        },
      });
      if (p.isCancel(projectName)) {
        p.cancel("Operation cancelled.");
        return;
      }
    }

    if (!template) {
      template = await p.select({
        message: "Select a template to use",
        options: [
          { value: "default", label: "Default", hint: "minimal TanStarter template" },
          { value: "monorepo", label: "Monorepo", hint: "with Turborepo & pnpm workspaces" },
        ],
      });
      if (p.isCancel(template)) {
        p.cancel("Operation cancelled.");
        return;
      }
    }

    if (install === undefined) {
      install = await p.confirm({
        message: "Install dependencies after scaffolding?",
        initialValue: true,
      });
      if (p.isCancel(install)) {
        p.cancel("Operation cancelled.");
        return;
      }
    }

    if (install && !selectedPackageManager) {
      selectedPackageManager = await p.select({
        message: "Select a package manager",
        options: [
          { value: "pnpm", label: "pnpm (Recommended)" },
          { value: "npm", label: "npm" },
          { value: "bun", label: "bun" },
          { value: "yarn", label: "yarn" },
          { value: "deno", label: "deno" },
        ],
        initialValue: preferredPackageManager,
      });
      if (p.isCancel(selectedPackageManager)) {
        p.cancel("Operation cancelled.");
        return;
      }
    }

    const spinner = p.spinner();
    try {
      spinner.start("Cloning project...");
      const { dir, source } = await downloadTemplate(
        `github:mugnavo/tanstarter${template === "monorepo" ? "#next" : ""}`,
        { dir: String(projectName) },
      );

      try {
        // remove LICENSE file since the template uses Unlicense
        await rm(join(dir, "LICENSE"), { force: true });
      } catch {}
      try {
        // copy .env.example files to .env
        if (template === "default") {
          await copyFile(join(dir, ".env.example"), join(dir, ".env"), constants.COPYFILE_EXCL);
        } else if (template === "monorepo") {
          await copyFile(
            join(dir, "apps", "web", ".env.example"),
            join(dir, "apps", "web", ".env"),
            constants.COPYFILE_EXCL,
          );
          await copyFile(
            join(dir, "packages", "db", ".env.example"),
            join(dir, "packages", "db", ".env"),
            constants.COPYFILE_EXCL,
          );
        }
      } catch {}

      const finalPackageManager = String(selectedPackageManager || preferredPackageManager);
      spinner.stop(`Project cloned from ${source}`);

      // init git repo but ignore errors
      await x("git", ["init"], {
        throwOnError: false,
        nodeOptions: {
          cwd: dir,
          stdio: "inherit",
        },
      });

      if (install) {
        const log = p.taskLog({
          title: `Installing dependencies with ${finalPackageManager}...`,
          limit: 5,
          retainLog: false,
        });

        const proc = x(finalPackageManager, ["install"], {
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
        } else {
          install = false;
          log.error(
            `Dependency installation failed. You can run ${finalPackageManager} install manually.`,
          );
        }
      }

      const devCommand =
        finalPackageManager === "npm"
          ? "npm run dev"
          : finalPackageManager === "deno"
            ? "deno task dev"
            : `${finalPackageManager} dev`;

      // template docs
      const githubUrl = `https://github.com/mugnavo/tanstarter${template === "monorepo" ? "/tree/next" : ""}`;

      p.note(
        `cd ${String(projectName)}${install ? "" : `\n${finalPackageManager} install`}\n${devCommand}\n\nSee README.md for next steps\n${githubUrl}`,
        "Next steps",
      );
      p.outro(`Project created successfully`);
    } catch (error) {
      spinner.stop();
      p.outro("Failed to download template. Please try again later.");
      console.error(error);
      return;
    }
  },
});

void runMain(main);
