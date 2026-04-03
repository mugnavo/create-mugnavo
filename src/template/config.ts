import type { Template } from "../cli/args";

export interface TemplateConfig {
  source: string;
  homeUrl: string;
}

const TEMPLATE_CONFIG: Record<Template, TemplateConfig> = {
  default: {
    source: "github:mugnavo/tanstarter",
    homeUrl: "https://github.com/mugnavo/tanstarter",
  },
  monorepo: {
    source: "github:mugnavo/tanstarter-plus",
    homeUrl: "https://github.com/mugnavo/tanstarter-plus",
  },
};

export function getTemplateConfig(template: Template): TemplateConfig {
  return TEMPLATE_CONFIG[template];
}
