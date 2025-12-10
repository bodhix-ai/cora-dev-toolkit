/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  plugins: ["no-restricted-globals"],
  overrides: [
    {
      files: ["**/*.ts", "**/*.tsx"],
      rules: {
        "no-restricted-globals": [
          "error",
          {
            name: "fetch",
            message:
              "Direct use of `fetch` is not allowed. Use the authenticated API client provided by `@sts-career/api-client` instead.",
          },
        ],
        "no-restricted-properties": [
          "error",
          {
            object: "localStorage",
            property: "getItem",
            message:
              "`localStorage.getItem` is not allowed for security reasons. Use NextAuth.js `useSession` for session management.",
          },
        ],
      },
    },
  ],
};
