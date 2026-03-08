import * as p from "@clack/prompts";
import { defineCommand, runMain } from "citty";
import { downloadTemplate } from "giget";

import { cliArgs } from "./cli/args";
import { getDevCommand, initGitRepo, installDependencies } from "./cli/package-manager";
import { resolveCliOptions } from "./cli/prompts";
import { getTemplateConfig } from "./template/config";
import { prepareTemplateFiles } from "./template/setup";

const main = defineCommand({
  meta: {
    name: "create-mugnavo",
    version: "0.1.5",
    description: "Create a project using Mugnavo templates.",
  },
  args: cliArgs,
  async run({ args }) {
    const resolvedOptions = await resolveCliOptions(args);
    if (!resolvedOptions) return;

    let { projectName, template, install, selectedPackageManager, preferredPackageManager } =
      resolvedOptions;

    const spinner = p.spinner();
    try {
      const templateConfig = getTemplateConfig(template);

      spinner.start("Cloning project...");
      const { dir, source } = await downloadTemplate(templateConfig.source, {
        dir: projectName,
      });

      await prepareTemplateFiles(dir, template);

      const finalPackageManager = selectedPackageManager || preferredPackageManager;
      spinner.stop(`Project cloned from ${source}`);

      await initGitRepo(dir);

      if (install) {
        const installed = await installDependencies(dir, finalPackageManager);
        if (!installed) {
          install = false;
        }
      }

      const devCommand = getDevCommand(finalPackageManager);

      p.note(
        `cd ${projectName}${install ? "" : `\n${finalPackageManager} install`}\n${devCommand}\n\nSee README.md for next steps\n${templateConfig.homeUrl}`,
        "Next steps",
      );
      p.outro(`All set. Happy coding! 🚀`);
    } catch (error) {
      spinner.stop();
      p.outro("Failed to download template. Please try again later.");
      console.error(error);
      return;
    }
  },
});

void runMain(main);
