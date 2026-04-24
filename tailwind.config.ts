import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        brand: {
          teal: '#0F766E',
          'teal-hover': '#0D9488',
          'teal-light': '#F0FDFA',
        },
        surface: {
          app: '#FAFAF8',
          card: '#FFFFFF',
          input: '#F5F5F3',
        },
      },
      borderColor: {
        DEFAULT: '#E5E5E3',
      },
    },
  },
  plugins: [],
}

export default config
