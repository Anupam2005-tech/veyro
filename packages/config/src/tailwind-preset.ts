/**
 * Veyro Shared Design Tokens & Tailwind Preset
 * Reference: docs/veyro.md §2.2, §2.3, §2.5
 */

export const veyroNightTokens = {
  canvas: '#030407',
  surface: '#0B0E17',
  glass: 'rgba(170, 176, 196, 0.08)',
  glassStrong: 'rgba(170, 176, 196, 0.14)',
  border: 'rgba(170, 176, 196, 0.22)',
  text: '#F2F4FA',
  muted: '#AAB0C4',
  accent: '#B8F23A',
  accentHover: '#C9F762',
  accentInk: '#030407',
  sassy: '#FF2E93',
} as const;

export const veyroStudioTokens = {
  bg: '#F8F9FC',
  surface: '#FFFFFF',
  obsidian: '#090B10',
  ink: '#090B10',
  muted: '#525866',
  tint: '#EEF2F8',
  border: '#E2E6F0',
  inputBorder: '#71788A',
  lime: '#B8F23A',
  sassy: '#FF2E93',
} as const;

export const veyroFonts = {
  display: ['Syne', 'sans-serif'],
  body: ['Inter', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
} as const;

export const veyroShape = {
  card: '0.75rem',
  panel: '0.5rem',
  control: '0.5rem',
} as const;

export const veyroShadow = {
  glass: '0 1px 2px rgba(0, 0, 0, 0.12)',
  lime: '0 0 0 1px rgba(184, 242, 58, 0.28)',
  'glass-glow': '0 0 0 0.5px rgba(255, 255, 255, 0.04) inset',
  'lime-glow': '0 0 0 2px rgba(184, 242, 58, 0.16)',
  'studio-card': '0 1px 2px rgba(9, 11, 16, 0.04)',
} as const;

export const veyroMotion = {
  'veyro-dash': 'veyro-dash 1.6s linear infinite',
  'veyro-float': 'veyro-float 6s ease-in-out infinite',
  'veyro-rise': 'veyro-rise 500ms ease-out both',
} as const;

