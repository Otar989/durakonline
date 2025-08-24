import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      'no-unused-vars': ['warn',{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'error',
      'prefer-const': ['warn',{ destructuring: 'all' }],
      'eqeqeq': ['warn','smart'],
      'no-console': ['warn',{ allow: ['warn','error'] }],
      'no-constant-binary-expression': 'warn',
  // JSX ложные срабатывания в условных рендерах
  '@typescript-eslint/no-unused-expressions': ['warn', { allowShortCircuit: true, allowTernary: true, allowTaggedTemplates: true }]
    }
  }
];

export default eslintConfig;
