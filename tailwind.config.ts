import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          turquoise: '#4ECDC4',
          'turquoise-light': '#7EDED8',
          'turquoise-dark': '#3DBDB5',
          navy: '#2C3347',
        },
      },
    },
  },
  plugins: [],
}

export default config
