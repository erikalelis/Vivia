/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        crema: '#F6F2FF',
        arena: '#E8E0FA',
        salvia: { DEFAULT: '#7C5CD6', dark: '#5B3FB5', soft: '#ECE5FC' },
        terracota: { DEFAULT: '#E0557A', soft: '#FDE8EE' },
        lila: '#B28CF0',
        tinta: '#2E2547',
        suave: '#75699a'
      },
      fontFamily: {
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Baloo 2"', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      borderRadius: { xl2: '1.25rem' },
      boxShadow: { calma: '0 8px 30px -10px rgba(91,63,181,0.25)' }
    }
  },
  plugins: []
};
