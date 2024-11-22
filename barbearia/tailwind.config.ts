import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      backgroundImage: {
        'custom-gradient':
          'linear-gradient(90deg, rgba(88,113,135,1) 0%, rgba(147,147,147,1) 50%, rgba(88,113,135,1) 100%)',
      },
    },
  },
  plugins: [],
} satisfies Config;
