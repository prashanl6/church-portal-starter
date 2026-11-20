/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Inter', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      // Larger steps than the Tailwind defaults so small labels stay readable for older eyes.
      fontSize: {
        xs: ['0.9375rem', { lineHeight: '1.4rem' }],
        sm: ['1rem', { lineHeight: '1.5rem' }],
        base: ['1.125rem', { lineHeight: '1.75rem' }],
        lg: ['1.25rem', { lineHeight: '1.8rem' }],
      },
      // Warm neutrals and the calm church blue replace Tailwind's cool greys and bright blue,
      // so utility classes used across the admin pages match the design system.
      colors: {
        gray: {
          50: '#faf9f7', 100: '#f3f2ef', 200: '#e7e5e0', 300: '#d6d3cc', 400: '#a8a59e',
          500: '#6e6e76', 600: '#55555c', 700: '#3f3f45', 800: '#2a2a2e', 900: '#1d1d1f',
        },
        slate: {
          50: '#faf9f7', 100: '#f3f2ef', 200: '#e7e5e0', 300: '#d6d3cc', 400: '#a8a59e',
          500: '#6e6e76', 600: '#55555c', 700: '#3f3f45', 800: '#2a2a2e', 900: '#1d1d1f',
        },
        blue: {
          50: '#f1f5fb', 100: '#e8eef7', 200: '#cfdcef', 300: '#a9c0e2', 400: '#6f93c8',
          500: '#3d6fb3', 600: '#2b5c9e', 700: '#234d86', 800: '#1d3f6e', 900: '#173257',
        },
        brand: {
          50:  '#f3f7ff',
          100: '#e3edff',
          200: '#c7dbff',
          500: '#2b5c9e', // calm church blue
          600: '#234d86',
        },
      },
      boxShadow: {
        soft: '0 8px 24px rgba(15, 23, 42, 0.08)',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: '#55555c',
            h1: { color: '#1d1d1f', fontWeight: '700' },
            h2: { color: '#1d1d1f', fontWeight: '700', marginTop: '1.5em', marginBottom: '0.5em' },
            h3: { color: '#55555c', fontWeight: '600', marginTop: '1.25em', marginBottom: '0.5em' },
            p: { marginTop: '1em', marginBottom: '1em', lineHeight: '1.75' },
            ul: { marginTop: '1em', marginBottom: '1em', paddingLeft: '1.5em' },
            li: { marginTop: '0.5em', marginBottom: '0.5em' },
            strong: { color: '#1d1d1f', fontWeight: '600' },
            em: { fontStyle: 'italic' },
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
