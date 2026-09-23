/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['ThmanyahSans', 'sans-serif'],
        mono: ['ThmanyahSans', 'monospace'],
        display: ['ThmanyahSerifDisplay', 'ThmanyahSans', 'serif'],
        text: ['ThmanyahSerifText', 'ThmanyahSans', 'serif'],
        serif: ['ThmanyahSerifDisplay', 'ThmanyahSerifText', 'serif'],
      },
      borderRadius: {
        DEFAULT: '4px',
        base: '4px',
        btn: '6px',
        sm: '4px',
        md: '4px',
        lg: '6px',
        xl: '6px',
        '2xl': '6px',
        full: '9999px',
        none: '0px',
      },
      colors: {
        sidebar: {
          dark: '#0e241c',
          header: '#081711',
          active: '#ea580c',
          text: '#94a3b8',
        },
        brand: {
          primary: '#166534',
          primaryHover: '#14532d',
          accent: '#ea580c',
        },
        table: {
          header: '#e9f0eb',
          border: '#d2dfd6',
        },
        acc: {
          due: '#dc2626',
          paid: '#16a34a',
          dark: '#0f172a',
        }
      }
    },
  },
  plugins: [],
}

