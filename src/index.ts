import * as p from "@clack/prompts";
import { defineCommand, runMain } from "citty";
import { downloadTemplate } from "giget";

import { cliArgs } from "./cli/args";
import { getDevCommand, initGitRepo, installDependencies } from "./cli/package-manager";
import { resolveCliOptions } from "./cli/prompts";
import { getTemplateConfig } from "./template/config";
import { prepareTemplateFiles } from "./template/setup";
import { resolveTemplateCommitSha } from "./template/source-metadata";

function getNextSteps(
  projectName: string,
  install: boolean,
  packageManager: string,
  devCommand: string,
) {
  const steps: string[] = [];

  if (projectName !== ".") {
    steps.push(`cd ${projectName}`);
  }

  if (!install) {
    steps.push(`${packageManager} install${packageManager === "npm" ? " --legacy-peer-deps" : ""}`);
  }

  steps.push(devCommand, "", "See README.md for next steps");

  return steps.join("\n");
}

const main = defineCommand({
  meta: {
    name: "create-mugnavo",
    version: "0.4.0",
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
      const templateCommitShaPromise = resolveTemplateCommitSha(templateConfig);

      spinner.start("Cloning project...");
      const { dir, source } = await downloadTemplate(templateConfig.source, {
        dir: projectName,
        force: true,
        forceClean: true,
      });

      await prepareTemplateFiles(dir, template, projectName, await templateCommitShaPromise);

      const finalPackageManager = selectedPackageManager || preferredPackageManager;
      spinner.stop(`Project cloned from ${source}`);

      await initGitRepo(dir);

      if (install) {
        const installed = await installDependencies(dir, finalPackageManager);
        if (!installed) {
          install = false;
        }
      }

      const nextSteps = getNextSteps(
        projectName,
        install,
        finalPackageManager,
        getDevCommand(finalPackageManager),
      );

      p.note(`${nextSteps}\n${templateConfig.homeUrl}`, "Next steps");
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
