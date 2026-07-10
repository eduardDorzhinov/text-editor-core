import js from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";
import stylistic from "@stylistic/eslint-plugin";
import stylisticTs from "@stylistic/eslint-plugin-ts";
import globals from "globals";

/** @type {import("eslint").Linter.Config[]} */
export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    ignores: ["dist/**", "wc-dist/**"],
  },
  {
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
      },
    },
  },
  {
    plugins: {
      "react-hooks": pluginReactHooks,
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  // Base: general JS/TS rules + @stylistic formatting
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["dist"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "@stylistic": stylistic,
      "@typescript-eslint": tseslint.plugin,
      "@stylistic/ts": stylisticTs,
      "unused-imports": unusedImports,
    },
    rules: {
      // General JS logic rules
      eqeqeq: ["error", "always"],
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-empty-function": "error",
      "no-duplicate-imports": ["error", { includeExports: true }],
      "no-inner-declarations": "error",
      "no-lonely-if": "error",
      "no-nested-ternary": "error",
      "no-useless-concat": "error",
      "no-useless-return": "error",
      "require-await": "error",
      "dot-notation": ["error", { allowPattern: "^[a-z]+(_[a-z]+)+$" }],
      camelcase: ["error", { ignoreImports: true }],
      "no-unsafe-optional-chaining": "off",

      // TypeScript
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@stylistic/ts/member-delimiter-style": [
        "error",
        {
          multiline: {
            delimiter: "comma",
            requireLast: true,
          },
          singleline: {
            delimiter: "comma",
            requireLast: false,
          },
          multilineDetection: "brackets",
        },
      ],
      "no-unused-vars": "off",

      // Stylistic formatting rules
      "@stylistic/array-bracket-newline": ["error", { minItems: 3 }],
      "@stylistic/array-bracket-spacing": [
        "error",
        "always",
        {
          objectsInArrays: false,
          arraysInArrays: false,
        },
      ],
      "@stylistic/array-element-newline": ["error", { minItems: 3 }],
      "@stylistic/arrow-parens": ["error", "always"],
      "@stylistic/block-spacing": "error",
      "@stylistic/computed-property-spacing": ["error", "always"],
      "@stylistic/dot-location": ["error", "property"],
      "@stylistic/function-paren-newline": ["error", { minItems: 3 }],
      "@stylistic/indent": ["error", 2],
      "@stylistic/indent-binary-ops": ["error", 2],
      "@stylistic/line-comment-position": [
        "error",
        { ignorePattern: "pragma" },
      ],
      "@stylistic/max-statements-per-line": ["error", { max: 1 }],
      "@stylistic/multiline-ternary": ["error", "always"],
      "@stylistic/newline-per-chained-call": [
        "error",
        { ignoreChainWithDepth: 2 },
      ],
      "@stylistic/no-mixed-spaces-and-tabs": ["error", "smart-tabs"],
      "@stylistic/no-multi-spaces": "error",
      "@stylistic/no-multiple-empty-lines": "error",
      "@stylistic/no-trailing-spaces": "error",
      "@stylistic/no-whitespace-before-property": "error",
      "@stylistic/operator-linebreak": ["error", "after"],
      "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
      "@stylistic/quote-props": ["error", "consistent"],
      "@stylistic/semi": ["error", "always"],
      "@stylistic/semi-spacing": "error",
      "@stylistic/semi-style": ["error", "last"],
      "@stylistic/space-before-blocks": "error",
      "@stylistic/space-in-parens": ["error", "never"],
      "@stylistic/type-annotation-spacing": "error",
      "@stylistic/type-generic-spacing": ["error"],
      "@stylistic/type-named-tuple-spacing": ["error"],
      "@stylistic/object-curly-newline": "off",
      "@stylistic/object-property-newline": "off",
      "@stylistic/comma-dangle": ["error", "always-multiline"],
      "@stylistic/key-spacing": "off",
      "@stylistic/brace-style": "off",
      "@stylistic/curly-newline": ["error", "always"],

      // JSX / React stylistic rules
      "@stylistic/jsx-child-element-spacing": "error",
      "@stylistic/jsx-closing-bracket-location": ["error", "line-aligned"],
      "@stylistic/jsx-closing-tag-location": ["error", "line-aligned"],
      "@stylistic/jsx-curly-newline": [
        "error",
        {
          multiline: "require",
          singleline: "forbid",
        },
      ],
      "@stylistic/jsx-indent-props": ["error", 2],
      "@stylistic/jsx-max-props-per-line": ["error", { maximum: 1 }],
      "@stylistic/jsx-one-expression-per-line": ["error", { allow: "non-jsx" }],
      "@stylistic/jsx-first-prop-new-line": ["error", "multiline"],
      "@stylistic/jsx-sort-props": [
        "error",
        {
          ignoreCase: true,
          callbacksLast: true,
          shorthandFirst: true,
          reservedFirst: true,
        },
      ],
      "@stylistic/jsx-tag-spacing": ["error", { beforeSelfClosing: "always" }],
      "@stylistic/jsx-wrap-multilines": [
        "error",
        {
          declaration: "parens",
          assignment: "parens-new-line",
          return: "parens-new-line",
          arrow: "parens-new-line",
          condition: "parens-new-line",
          logical: "parens-new-line",
          prop: "parens",
          propertyValue: "parens",
        },
      ],
      "@stylistic/object-curly-spacing": [
        "error",
        "always",
        {
          arraysInObjects: false,
          objectsInObjects: false,
        },
      ],
    },
  },

  // Import sorting
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["dist"],
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            ["^react", "^next"],
            ["^@?\\w"],
            ["^@/"],
            ["^\\."],
            ["^.+\\.s?css$"],
            ["^\\u0000"],
          ],
        },
      ],
      "simple-import-sort/exports": "error",
    },
  },
];
