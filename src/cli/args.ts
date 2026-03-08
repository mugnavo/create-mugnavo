import type { ArgsDef, ParsedArgs } from "citty";

function defineOptions<const T extends string[]>(options: T) {
  return options;
}

export const TEMPLATE_VALUES = defineOptions(["default", "monorepo"]);
export const PACKAGE_MANAGER_VALUES = defineOptions(["pnpm", "npm", "bun", "yarn", "deno"]);

export type Template = (typeof TEMPLATE_VALUES)[number];
export type PackageManager = (typeof PACKAGE_MANAGER_VALUES)[number];

export const cliArgs = {
  name: {
    type: "positional",
    description: "Project name",
    required: false,
  },
  template: {
    type: "enum",
    description: "Template to use",
    options: TEMPLATE_VALUES,
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
    options: PACKAGE_MANAGER_VALUES,
    required: false,
    alias: ["p"],
  },
} satisfies ArgsDef;

export type CliArgs = ParsedArgs<typeof cliArgs>;
