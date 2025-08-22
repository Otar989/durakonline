import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        glass: 'rgba(255,255,255,0.25)',
        glassDark: 'rgba(0,0,0,0.35)',
      },
      backdropBlur: {
        xs: '2px'
      },
      boxShadow: {
        glass: '0 4px 24px -2px rgba(0,0,0,0.25)',
      },
    }
  },
  plugins: []
} satisfies Config
