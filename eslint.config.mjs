import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/components/Zt*"],
              message:
                "盈利系统代码禁止直接引用智探007业务组件；请改走API契约或共享层。",
              allowTypeImports: true,
            },
            {
              group: [
                "@/components/Quote*",
                "@/components/Compass*",
                "@/components/Dashboard*",
                "@/components/Projects*",
              ],
              message:
                "智探007代码禁止直接引用盈利系统业务组件；请改走API契约或共享层。",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
