/**
 * CORA Navigation (cora-nav) - ESLint rules for navigation pattern enforcement
 *
 * Naming Convention: .eslintrc.cora-<acronym>.js
 * - Follows CORA compliance pattern established in .eslintrc.cora-auth.js
 * - "cora-nav" = CORA Navigation module isolation enforcement
 *
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  rules: {
    // Prevent direct Sidebar modification in modules
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["**/org-module/frontend/components/layout/Sidebar"],
            message:
              "Modules must not import or modify Sidebar directly. Export navigation config instead.",
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ["**/navigation.ts"],
      rules: {
        "@typescript-eslint/explicit-module-boundary-types": "error",
        "@typescript-eslint/no-explicit-any": "error",
      },
    },
  ],
};
