import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

import autoImports from './.wxt/eslint-auto-imports.mjs';

export default tseslint.config(
  autoImports,
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    rules: {
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true },
      ],
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
