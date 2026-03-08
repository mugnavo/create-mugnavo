import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { CliArgs } from "../src/cli/args";
import { ensureDirectoryIsEmpty, resolveCliOptions, validateProjectName } from "../src/cli/prompts";
import { prepareTemplateFiles } from "../src/template/setup";

const tempDirs: string[] = [];
const originalCwd = process.cwd();

async function createTempDir() {
  const dir = await mkdtemp(join(tmpdir(), "create-mugnavo-"));
  tempDirs.push(dir);
  return dir;
}

function createCliArgs(overrides: {
  name?: CliArgs["name"];
  template?: CliArgs["template"];
  install?: CliArgs["install"];
  packageManager?: CliArgs["packageManager"];
}): CliArgs {
  return {
    _: [],
    ...overrides,
  } as unknown as CliArgs;
}

beforeEach(() => {
  process.chdir(originalCwd);
});

describe("prepareTemplateFiles", () => {
  afterEach(async () => {
    process.chdir(originalCwd);
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("removes the readme marker and blank line before the description", async () => {
    const dir = await createTempDir();

    await mkdir(join(dir, "src", "routes"), { recursive: true });
    await writeFile(join(dir, ".env.example"), "FOO=bar\n");
    await writeFile(join(dir, "package.json"), '{"name":"template-app"}\n');
    await writeFile(
      join(dir, "README.md"),
      ["# template-app", "", "<!-- scaffold:description -->", "", "Template description.", ""].join(
        "\n",
      ),
    );
    await writeFile(
      join(dir, "src", "routes", "__root.tsx"),
      [
        "export const Route = {",
        "  head: () => ({",
        "    // scaffold:title",
        '    title: "template-app",',
        "    meta: [",
        "      {",
        "        // scaffold:description",
        '        content: "Template description.",',
        "      },",
        "    ],",
        "  }),",
        "};",
        "",
      ].join("\n"),
    );

    await prepareTemplateFiles(dir, "default", "my-app");

    await expect(readFile(join(dir, "README.md"), "utf8")).resolves.toBe(
      [
        "# my-app",
        "",
        "This project was scaffolded with [`create-mugnavo`](https://github.com/mugnavo/create-mugnavo).",
        "",
      ].join("\n"),
    );
  });

  it("uses the current directory name when projectName is .", async () => {
    const dir = await createTempDir();
    const directoryName = basename(dir);

    await mkdir(join(dir, "src", "routes"), { recursive: true });
    await writeFile(join(dir, ".env.example"), "FOO=bar\n");
    await writeFile(join(dir, "package.json"), '{"name":"template-app"}\n');
    await writeFile(
      join(dir, "README.md"),
      ["# template-app", "", "<!-- scaffold:description -->", "", "Template description.", ""].join(
        "\n",
      ),
    );
    await writeFile(
      join(dir, "src", "routes", "__root.tsx"),
      [
        "export const Route = {",
        "  head: () => ({",
        "    // scaffold:title",
        '    title: "template-app",',
        "    meta: [",
        "      {",
        "        // scaffold:description",
        '        content: "Template description.",',
        "      },",
        "    ],",
        "  }),",
        "};",
        "",
      ].join("\n"),
    );

    await prepareTemplateFiles(dir, "default", ".");

    await expect(readFile(join(dir, "package.json"), "utf8")).resolves.toBe(
      `${JSON.stringify({ name: directoryName }, null, 2)}\n`,
    );
    await expect(readFile(join(dir, "README.md"), "utf8")).resolves.toBe(
      [
        `# ${directoryName}`,
        "",
        "This project was scaffolded with [`create-mugnavo`](https://github.com/mugnavo/create-mugnavo).",
        "",
      ].join("\n"),
    );
    await expect(readFile(join(dir, "src", "routes", "__root.tsx"), "utf8")).resolves.toContain(
      `title: ${JSON.stringify(directoryName)},`,
    );
  });
});

describe("validateProjectName", () => {
  it("allows . to scaffold into the current directory", () => {
    expect(validateProjectName(".")).toBeUndefined();
  });

  it("trims leading and trailing whitespace", () => {
    expect(validateProjectName("  my-app  ")).toBeUndefined();
  });

  it("accepts a safe cross-platform package name", () => {
    expect(validateProjectName("my-app_2")).toBeUndefined();
    expect(validateProjectName("MyApp")).toBeUndefined();
  });

  it("rejects names with path separators", () => {
    expect(validateProjectName("@scope/app")).toBe("Project name cannot contain path separators");
    expect(validateProjectName("my\\app")).toBe("Project name cannot contain path separators");
  });

  it("still rejects ..", () => {
    expect(validateProjectName("..")).toBe("Project name cannot be ..");
  });

  it("rejects names that are invalid on Windows", () => {
    expect(validateProjectName("my:app")).toBe("Project name contains invalid characters");
  });

  it("rejects names outside the supported character set", () => {
    expect(validateProjectName("my app")).toBe(
      "Use letters, numbers, periods, underscores, or hyphens",
    );
  });
});

describe("ensureCurrentDirectoryIsEmpty", () => {
  it("returns undefined for an empty current directory", async () => {
    const dir = await createTempDir();

    process.chdir(dir);

    await expect(ensureDirectoryIsEmpty(process.cwd())).resolves.toBeUndefined();
  });

  it("returns an error for a non-empty current directory", async () => {
    const dir = await createTempDir();

    await writeFile(join(dir, "README.md"), "existing\n");
    process.chdir(dir);

    await expect(ensureDirectoryIsEmpty(process.cwd())).resolves.toBe("Directory must be empty.");
  });

  it("returns undefined for a missing target directory", async () => {
    const dir = await createTempDir();

    await expect(ensureDirectoryIsEmpty(join(dir, "new-project"))).resolves.toBeUndefined();
  });

  it("returns undefined for an existing empty target directory", async () => {
    const dir = await createTempDir();
    const targetDir = join(dir, "empty-project");

    await mkdir(targetDir);

    await expect(ensureDirectoryIsEmpty(targetDir)).resolves.toBeUndefined();
  });

  it("returns an error for an existing non-empty target directory", async () => {
    const dir = await createTempDir();
    const targetDir = join(dir, "existing-project");

    await mkdir(targetDir);
    await writeFile(join(targetDir, "README.md"), "existing\n");

    await expect(ensureDirectoryIsEmpty(targetDir)).resolves.toBe("Directory must be empty.");
  });
});

describe("resolveCliOptions", () => {
  it("allows a named target directory when it does not exist yet", async () => {
    const dir = await createTempDir();

    process.chdir(dir);

    await expect(
      resolveCliOptions(
        createCliArgs({
          name: "new-project",
          template: "default",
          install: false,
        }),
      ),
    ).resolves.toMatchObject({
      projectName: "new-project",
      template: "default",
      install: false,
    });
  });

  it("allows a named target directory when it exists and is empty", async () => {
    const dir = await createTempDir();

    await mkdir(join(dir, "existing-project"));
    process.chdir(dir);

    await expect(
      resolveCliOptions(
        createCliArgs({
          name: "existing-project",
          template: "default",
          install: false,
        }),
      ),
    ).resolves.toMatchObject({
      projectName: "existing-project",
      template: "default",
      install: false,
    });
  });

  it("rejects a named target directory when it exists and is not empty", async () => {
    const dir = await createTempDir();
    const targetDir = join(dir, "existing-project");

    await mkdir(targetDir);
    await writeFile(join(targetDir, "README.md"), "existing\n");
    process.chdir(dir);

    await expect(
      resolveCliOptions(
        createCliArgs({
          name: "existing-project",
          template: "default",
          install: false,
        }),
      ),
    ).resolves.toBeUndefined();
  });
});
