import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Veyro Night tokens (public landing / auth)
        night: {
          canvas: '#030407',
          surface: '#0B0E17',
          glass: 'rgba(170, 176, 196, 0.08)',
          'glass-strong': 'rgba(170, 176, 196, 0.14)',
          border: 'rgba(170, 176, 196, 0.22)',
          text: '#F2F4FA',
          muted: '#AAB0C4',
          accent: '#B8F23A',
          'accent-hover': '#C9F762',
          'accent-ink': '#030407',
          sassy: '#FF2E93',
        },
        // Veyro Studio Light tokens (authenticated app)
        studio: {
          bg: '#F8F9FC',
          surface: '#FFFFFF',
          obsidian: '#090B10',
          ink: '#090B10',
          muted: '#525866',
          tint: '#EEF2F8',
          border: '#E2E6F0',
          'input-border': '#71788A',
          lime: '#B8F23A',
          sassy: '#FF2E93',
        },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;

