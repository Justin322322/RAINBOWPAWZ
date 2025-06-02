import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

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
    rules: {
      // Disable quotes rule to allow apostrophes without linting errors
      "quotes": "off",
      "@typescript-eslint/quotes": "off",
      // Allow both single and double quotes
      "jsx-quotes": "off"
    }
  }
];

export default eslintConfig;
