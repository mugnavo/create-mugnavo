import * as p from "@clack/prompts";
import { defineCommand, runMain } from "citty";

const main = defineCommand({
  meta: {
    name: "create-my-app",
    version: "0.1.0",
  },
  args: {
    name: {
      type: "positional",
      description: "Project name",
      required: false,
    },
    framework: {
      type: "enum",
      description: "Framework to use",
      options: ["tanstack-start", "astro"],
      required: false,
    },
  },
  async run({ args }) {
    let projectName = args.name as string | symbol | undefined;
    let framework = args.framework as string | symbol | undefined;

    if (!projectName) {
      projectName = await p.text({
        message: "Project name?",
        placeholder: "my-mugnavo-project",
        defaultValue: "my-mugnavo-project",
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

    if (!framework) {
      framework = await p.select({
        message: "Which framework do you want to use?",
        options: [
          { value: "tanstack-start", label: "TanStack Start" },
          { value: "astro", label: "Astro" },
        ],
      });
      if (p.isCancel(framework)) {
        p.cancel("Operation cancelled.");
        return;
      }
    }

    const spinner = p.spinner();
    spinner.start("Scaffolding project...");

    // WIP
    console.log(args, projectName, framework);
    // wait 3 seconds to simulate scaffolding
    await new Promise((resolve) => setTimeout(resolve, 3000));

    spinner.stop();
    p.outro("Project created successfully.");
  },
});

runMain(main);
