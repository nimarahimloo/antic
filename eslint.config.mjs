import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "backend/**",
      "my-agent/**",
      "out/**",
      "next-env.d.ts",
      ".agents/**",
      "scripts/**",
      "prisma/**",
      "**/*.bak",
    ],
  },
  // کانفیگ پیشنهادی Next.js (core-web-vitals + typescript) — flat config
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    files: ["src/**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    ...pluginJs.configs.recommended,
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "unused-imports": pluginUnusedImports,
    },
    rules: {
      ...pluginReact.configs.flat.recommended.rules,
      "no-unused-vars": "off",
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
        },
      ],
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/no-unknown-property": [
        "error",
        { ignore: ["cmdk-input-wrapper", "toast-close"] },
      ],
      "react-hooks/rules-of-hooks": "error",
      // قوانین پیش‌فرض react/no-unescaped-entities برای متن فارسی سخت‌گیرانه است
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",

      // --- React Compiler diagnostic rules ---------------------------------
      // این قوانین برای کامپایلر React نوشته شده‌اند. در این پروژه کامپایلر
      // فعال نیست (reactCompiler در next.config.mjs خاموش است) و الگوهای
      // «fetch داخل effect» رایج و سالم هستند، پس به‌جای error با warning
      // گزارش می‌شوند تا مسیر مهاجرت به کامپایلر روشن بماند.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/set-state-in-render": "warn",
    },
  },
  {
    // فایل‌های کانفیگ Node.js (CommonJS) — require مجاز است
    files: ["**/*.cjs", "**/*.config.js", "**/*.config.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
    },
  },
];

export default eslintConfig;
