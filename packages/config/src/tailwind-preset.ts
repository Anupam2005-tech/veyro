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

