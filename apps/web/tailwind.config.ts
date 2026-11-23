import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Veyro light design tokens (used across the whole app)
        studio: {
          bg: '#F7F7F8',
          surface: '#FFFFFF',
          obsidian: '#111827',
          ink: '#111827',
          muted: '#6B7280',
          tint: '#F3F4F6',
          border: '#E5E7EB',
          'input-border': '#D1D5DB',
          brand: '#0F766E',
          'brand-hover': '#115E59',
          'brand-soft': '#E6F4F1',
          sassy: '#DC2626',
        },
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;

