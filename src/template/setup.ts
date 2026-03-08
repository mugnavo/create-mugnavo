import { constants } from "node:fs";
import { copyFile, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

import type { Template } from "../cli/args";

const TITLE_MARKER = "// scaffold:title";
const DESCRIPTION_MARKER = "// scaffold:description";
const README_DESCRIPTION_MARKER = "<!-- scaffold:description -->";

type MarkerReplacement = {
  marker: string;
  replacementContent: string;
  skipEmptyLinesAfterMarker?: boolean;
};

function resolveGeneratedProjectName(dir: string, projectName: string) {
  if (projectName !== ".") {
    return projectName;
  }

  return basename(resolve(dir)) || "app";
}

async function removeLicenseFile(dir: string) {
  await rm(join(dir, "LICENSE"), { force: true });
}

async function copyEnvFiles(dir: string, template: Template) {
  if (template === "default") {
    await copyFile(join(dir, ".env.example"), join(dir, ".env"), constants.COPYFILE_EXCL);
    return;
  }

  if (template === "monorepo") {
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
}

async function updatePackageName(dir: string, projectName: string) {
  const packageJsonPath = join(dir, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
    name?: string;
  };

  packageJson.name = resolveGeneratedProjectName(dir, projectName);

  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

async function updateReadme(dir: string, projectName: string) {
  const readmePath = join(dir, "README.md");
  const generatedProjectName = resolveGeneratedProjectName(dir, projectName);
  const readme = await readFile(readmePath, "utf8");
  const lineBreak = readme.includes("\r\n") ? "\r\n" : "\n";
  const lines = readme.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.startsWith("# "));

  if (headingIndex === -1) {
    if (lines.length > 0) {
      lines[0] = `# ${generatedProjectName}`;
    }
  } else {
    lines[headingIndex] = `# ${generatedProjectName}`;
  }

  replaceMarkersInLines(lines, [
    {
      marker: README_DESCRIPTION_MARKER,
      replacementContent:
        "This project was scaffolded with [`create-mugnavo`](https://github.com/mugnavo/create-mugnavo).",
      skipEmptyLinesAfterMarker: true,
    },
  ]);

  const updatedReadme = lines.join(lineBreak);

  if (updatedReadme !== readme) {
    await writeFile(readmePath, updatedReadme);
  }
}

function replaceMarkersInLines(lines: string[], replacements: MarkerReplacement[]) {
  let didChange = false;

  for (const { marker, replacementContent, skipEmptyLinesAfterMarker } of replacements) {
    const markerIndex = lines.findIndex((line) => line.trim() === marker);

    if (markerIndex === -1) {
      continue;
    }

    let targetIndex = markerIndex + 1;

    if (skipEmptyLinesAfterMarker) {
      while (lines[targetIndex] !== undefined && lines[targetIndex]?.trim() === "") {
        targetIndex += 1;
      }
    }

    const targetLine = lines[targetIndex];

    if (targetLine === undefined) {
      lines.splice(markerIndex, 1);
      didChange = true;
      continue;
    }

    const indentation = targetLine.match(/^\s*/)?.[0] ?? "";
    const updatedLine = `${indentation}${replacementContent}`;

    lines.splice(markerIndex, targetIndex - markerIndex + 1, updatedLine);
    didChange = true;
  }

  return didChange;
}

async function replaceLinesAfterMarkers(filePath: string, replacements: MarkerReplacement[]) {
  const fileContents = await readFile(filePath, "utf8");
  const lineBreak = fileContents.includes("\r\n") ? "\r\n" : "\n";
  const lines = fileContents.split(/\r?\n/);

  if (!replaceMarkersInLines(lines, replacements)) {
    return;
  }

  await writeFile(filePath, lines.join(lineBreak));
}

async function updateAppMetadata(dir: string, template: Template, projectName: string) {
  const generatedProjectName = resolveGeneratedProjectName(dir, projectName);
  const rootRoutePath =
    template === "default"
      ? join(dir, "src", "routes", "__root.tsx")
      : join(dir, "apps", "web", "src", "routes", "__root.tsx");

  await replaceLinesAfterMarkers(rootRoutePath, [
    {
      marker: TITLE_MARKER,
      replacementContent: `title: ${JSON.stringify(generatedProjectName)},`,
    },
    {
      marker: DESCRIPTION_MARKER,
      replacementContent: `content: "A TanStack Start project scaffolded with create-mugnavo.",`,
    },
  ]);
}

export async function prepareTemplateFiles(dir: string, template: Template, projectName: string) {
  await Promise.allSettled([
    removeLicenseFile(dir),
    copyEnvFiles(dir, template),
    updatePackageName(dir, projectName),
    updateReadme(dir, projectName),
    updateAppMetadata(dir, template, projectName),
  ]);
}
