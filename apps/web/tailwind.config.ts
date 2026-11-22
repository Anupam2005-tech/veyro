import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          canvas: 'var(--theme-canvas)',
          surface: 'var(--theme-surface)',
          glass: 'var(--theme-glass)',
          'glass-strong': 'var(--theme-glass-strong)',
          border: 'var(--theme-border)',
          text: 'var(--theme-text)',
          muted: 'var(--theme-muted)',
          accent: 'var(--theme-accent)',
          'accent-hover': 'var(--theme-accent-hover)',
          'accent-ink': 'var(--theme-accent-ink)',
          sassy: 'var(--theme-sassy)',
        },
        night: {
          canvas: 'var(--night-canvas)',
          surface: 'var(--night-surface)',
          glass: 'var(--night-glass)',
          'glass-strong': 'var(--night-glass-strong)',
          border: 'var(--night-border)',
          text: 'var(--night-text)',
          muted: 'var(--night-muted)',
          accent: 'var(--night-accent)',
          'accent-hover': 'var(--night-accent-hover)',
          'accent-ink': 'var(--night-accent-ink)',
          sassy: 'var(--night-sassy)',
        },
        studio: {
          bg: 'var(--studio-bg)',
          surface: 'var(--studio-surface)',
          obsidian: 'var(--studio-obsidian)',
          ink: 'var(--studio-ink)',
          muted: 'var(--studio-muted)',
          tint: 'var(--studio-tint)',
          border: 'var(--studio-border)',
          'input-border': 'var(--studio-input-border)',
          lime: 'var(--studio-lime)',
          sassy: 'var(--studio-sassy)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        card: '1.25rem',
        panel: '1rem',
      },
      boxShadow: {
        glass: '0 24px 70px -35px rgba(0, 0, 0, 0.85)',
        lime: '0 0 0 1px rgba(184, 242, 58, 0.28)',
      },
      maxWidth: {
        content: '72rem',
      },
      keyframes: {
        'veyro-dash': { to: { strokeDashoffset: '-32' } },
        'veyro-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'veyro-rise': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'veyro-dash': 'veyro-dash 1.6s linear infinite',
        'veyro-float': 'veyro-float 6s ease-in-out infinite',
        'veyro-rise': 'veyro-rise 500ms ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
