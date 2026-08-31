/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1A73E8',
          hover: '#1765CC',
          container: '#D2E3FC',
          on: '#FFFFFF',
        },
        surface: {
          DEFAULT: '#F8F9FA',
          variant: '#F1F3F4',
        },
        outline: '#DADCE0',
        textPrimary: '#202124',
        textSecondary: '#5F6368',
        success: '#188038',
        warning: '#F9AB00',
        error: '#D93025',
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        h1: '28px',
        h2: '22px',
        h3: '18px',
        body: '15px',
        caption: '12px',
      },
      fontWeight: {
        regular: '400',
        medium: '500',
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '16px',
        4: '24px',
        5: '32px',
        6: '48px',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        pill: '999px',
      },
      boxShadow: {
        elevation1:
          '0 1px 2px rgba(60,64,67,.30), 0 1px 3px 1px rgba(60,64,67,.15)',
        elevation2:
          '0 1px 3px rgba(60,64,67,.30), 0 4px 8px 3px rgba(60,64,67,.15)',
      },
    },
  },
  plugins: [],
}
