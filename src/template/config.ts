import type { Template } from "../cli/args";

interface TemplateConfig {
  source: string;
  homeUrl: string;
}

const TEMPLATE_CONFIG: Record<Template, TemplateConfig> = {
  default: {
    source: "github:mugnavo/tanstarter",
    homeUrl: "https://github.com/mugnavo/tanstarter",
  },
  monorepo: {
    source: "github:mugnavo/tanstarter#next",
    homeUrl: "https://github.com/mugnavo/tanstarter/tree/next",
  },
};

export function getTemplateConfig(template: Template): TemplateConfig {
  return TEMPLATE_CONFIG[template];
}
