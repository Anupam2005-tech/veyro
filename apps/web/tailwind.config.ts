import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--theme-canvas)',
        foreground: 'var(--theme-text)',
        primary: {
          DEFAULT: 'var(--theme-accent)',
          foreground: 'var(--theme-accent-ink)',
        },
        muted: {
          DEFAULT: 'var(--theme-surface)',
          foreground: 'var(--theme-muted)',
        },
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
        card: '0.75rem',
        panel: '0.5rem',
        control: '0.5rem',
      },
      boxShadow: {
        glass: '0 1px 2px rgba(0, 0, 0, 0.12)',
        lime: '0 0 0 1px rgba(184, 242, 58, 0.28)',
        'glass-glow': '0 0 0 0.5px rgba(255, 255, 255, 0.04) inset',
        'lime-glow': '0 0 0 2px rgba(184, 242, 58, 0.16)',
        'card-hover': '0 4px 16px -8px rgba(0, 0, 0, 0.18)',
        'studio-card': '0 1px 2px rgba(9, 11, 16, 0.04)',
        'studio-card-hover': '0 2px 8px rgba(9, 11, 16, 0.08)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      maxWidth: {
        content: '82rem',
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
