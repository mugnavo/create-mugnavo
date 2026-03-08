import * as p from "@clack/prompts";

import {
  PACKAGE_MANAGER_VALUES,
  TEMPLATE_VALUES,
  type CliArgs,
  type PackageManager,
  type Template,
} from "./args";
import { detectPackageManagerFromUserAgent, isPnpmAvailable } from "./package-manager";

export interface ResolvedCliOptions {
  projectName: string;
  template: Template;
  install: boolean;
  selectedPackageManager?: PackageManager;
  preferredPackageManager: PackageManager;
}

function isOneOf<const T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === "string" && values.includes(value);
}

async function promptProjectName() {
  const projectName = await p.text({
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

  return projectName;
}

async function promptTemplate() {
  const template = await p.select({
    message: "Select a template to use",
    options: [
      { value: "default", label: "Default", hint: "minimal TanStarter template" },
      { value: "monorepo", label: "Monorepo", hint: "TanStarter via Turborepo & pnpm workspaces" },
    ],
  });

  if (p.isCancel(template)) {
    p.cancel("Operation cancelled.");
    return;
  }

  return template;
}

async function promptInstall() {
  const install = await p.confirm({
    message: "Install dependencies after scaffolding?",
    initialValue: true,
  });

  if (p.isCancel(install)) {
    p.cancel("Operation cancelled.");
    return;
  }

  return install;
}

async function promptPackageManager(
  preferredPackageManager: ResolvedCliOptions["preferredPackageManager"],
) {
  const selectedPackageManager = await p.select({
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

  return selectedPackageManager;
}

export async function resolveCliOptions(args: CliArgs): Promise<ResolvedCliOptions | undefined> {
  let projectName = args.name;
  let template = args.template;
  let install = args.install;
  let selectedPackageManager = args.packageManager;

  const preferredPackageManager = (await isPnpmAvailable())
    ? "pnpm"
    : detectPackageManagerFromUserAgent();

  if (!projectName) {
    projectName = await promptProjectName();
    if (!projectName) return;
  }

  if (!template) {
    template = await promptTemplate();
    if (!template) return;
  }

  if (install === undefined) {
    install = await promptInstall();
    if (install === undefined) return;
  }

  if (install && !selectedPackageManager) {
    selectedPackageManager = await promptPackageManager(preferredPackageManager);
    if (!selectedPackageManager) return;
  }

  if (!isOneOf(TEMPLATE_VALUES, template) || typeof install !== "boolean") return;
  if (
    selectedPackageManager !== undefined &&
    !isOneOf(PACKAGE_MANAGER_VALUES, selectedPackageManager)
  )
    return;

  return {
    projectName: String(projectName),
    template,
    install,
    selectedPackageManager,
    preferredPackageManager,
  };
}
