// ESLint flat config
const js = require("@eslint/js");
const reactPlugin = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");
const importPlugin = require("eslint-plugin-import");
const jsxA11y = require("eslint-plugin-jsx-a11y");
const prettierPlugin = require("eslint-plugin-prettier");
const tsPlugin = require("@typescript-eslint/eslint-plugin");

module.exports = [
  // Replace .eslintignore
  {
    ignores: [
      "node_modules/**",
      "extension/**",
      "extension/*.zip",
      "dist/**",
      "**/*.min.js",
    ],
  },

  js.configs.recommended,

  // Node.js config files (CommonJS)
  {
    files: [
      "eslint.config.js",
      "webpack.config.js",
      "vitest.config.js",
      "babel.config.js",
    ],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "commonjs",
      globals: {
        require: "readonly",
        module: "readonly",
        process: "readonly",
        __dirname: "readonly",
        console: "readonly",
      },
    },
  },

  // Remaining plain JavaScript/JSX (browser environment)
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        browser: "readonly",
        document: "readonly",
        navigator: "readonly",
        window: "readonly",
        URL: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
      },
    },
    settings: {
      react: { version: "detect" },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
      import: importPlugin,
      "jsx-a11y": jsxA11y,
      prettier: prettierPlugin,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "prettier/prettier": "warn",
    },
  },

  // TypeScript source and tests
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: require("@typescript-eslint/parser"),
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        browser: "readonly",
        document: "readonly",
        navigator: "readonly",
        window: "readonly",
        URL: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        global: "readonly",
      },
    },
    settings: {
      react: { version: "detect" },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
      import: importPlugin,
      "jsx-a11y": jsxA11y,
      prettier: prettierPlugin,
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      // TypeScript resolves these itself via lib declarations; ESLint's
      // no-undef only produces false positives (e.g. HTMLInputElement).
      "no-undef": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "prettier/prettier": "warn",
    },
  },
];
