const { formatter } = require("@lingui/format-po");

/** @type {import('@lingui/conf').LinguiConfig} */
module.exports = {
  locales: ["en", "zh-CN"],
  sourceLocale: "en",
  catalogs: [
    {
      path: "<rootDir>/packages/shared/src/locales/{locale}/messages",
      include: ["<rootDir>/packages/app/src", "<rootDir>/packages/shared/src"],
    },
  ],
  format: formatter({ lineNumbers: false }),
  orderBy: "messageId",
  compileNamespace: "es",
};