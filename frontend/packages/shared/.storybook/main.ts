import { lingui } from "@lingui/vite-plugin";
import { linguiMacroSwcPlugin } from "@lingui/swc-plugin/options";
import type { StorybookConfig } from "@storybook/react-vite";
import react from "@vitejs/plugin-react-swc";
import { mergeConfig } from "vite";

const config: StorybookConfig = {
  addons: ["@storybook/addon-docs"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  stories: ["../stories/**/*.mdx", "../stories/**/*.stories.@(ts|tsx)"],
  viteFinal: async (config) =>
    mergeConfig(config, {
      // Storybook bundles the same macro-bearing feature components as the app.
      // Compile those macros before Vite resolves browser dependencies, so they
      // never reach the preview as Node-only `babel-plugin-macros`/`jiti` code.
      plugins: [
        react({ plugins: [linguiMacroSwcPlugin()] }),
        lingui(),
      ],
    }),
};
export default config;
