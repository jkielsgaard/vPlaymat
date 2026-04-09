import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        felt: {
          DEFAULT: '#1a2e1a',
          dark: '#111e11',
          light: '#223322',
        },
        gold: {
          DEFAULT: '#c9a84c',
          light: '#e8c96a',
          dark: '#a07830',
        },
        mtg: {
          bg: '#0d1a0d',
          border: '#3a5a3a',
          card: '#2a3a2a',
        },
      },
      transitionProperty: {
        transform: 'transform',
      },
    },
  },
  plugins: [],
}

export default config
