import { Config } from 'tailwindcss';

export default {
  content: ['./{entrypoints,components}/**/*.tsx'],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
