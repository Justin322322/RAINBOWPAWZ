import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import unusedImports from "eslint-plugin-unused-imports";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: ["**/node_modules/**", "**/.next/**"]
  },
  ...compat.extends("next/core-web-vitals"),
  {
    plugins: {
      "unused-imports": unusedImports
    },
    rules: {
      // Disable quotes rule to allow apostrophes without linting errors
      "quotes": "off",
      "@typescript-eslint/quotes": "off",
      // Allow both single and double quotes
      "jsx-quotes": "off",
      // Unused imports rules
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          "vars": "all",
          "varsIgnorePattern": "^_",
          "args": "after-used",
          "argsIgnorePattern": "^_",
          "destructuredArrayIgnorePattern": "^_"
        },
      ],
    }
  }
];

export default eslintConfig;
