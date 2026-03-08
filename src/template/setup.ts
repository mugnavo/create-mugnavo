import { constants } from "node:fs";
import { copyFile, rm } from "node:fs/promises";
import { join } from "node:path";

import type { Template } from "../cli/args";

export async function prepareTemplateFiles(dir: string, template: Template) {
  try {
    await rm(join(dir, "LICENSE"), { force: true });
  } catch {}

  try {
    if (template === "default") {
      await copyFile(join(dir, ".env.example"), join(dir, ".env"), constants.COPYFILE_EXCL);
      return;
    }

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
  } catch {}
}
