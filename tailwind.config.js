/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        base: "18px", // good for older eyes
      },
      colors: {
        brand: {
          50:  '#f3f7ff',
          100: '#e3edff',
          200: '#c7dbff',
          500: '#2563eb', // main blue
          600: '#1d4ed8',
        },
      },
      boxShadow: {
        soft: '0 8px 24px rgba(15, 23, 42, 0.08)',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: '#374151',
            h1: { color: '#111827', fontWeight: '700' },
            h2: { color: '#1f2937', fontWeight: '700', marginTop: '1.5em', marginBottom: '0.5em' },
            h3: { color: '#374151', fontWeight: '600', marginTop: '1.25em', marginBottom: '0.5em' },
            p: { marginTop: '1em', marginBottom: '1em', lineHeight: '1.75' },
            ul: { marginTop: '1em', marginBottom: '1em', paddingLeft: '1.5em' },
            li: { marginTop: '0.5em', marginBottom: '0.5em' },
            strong: { color: '#111827', fontWeight: '600' },
            em: { fontStyle: 'italic' },
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
