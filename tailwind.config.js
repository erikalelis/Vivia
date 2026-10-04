/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Identidad de Vivia
        berry: { DEFAULT: '#A8245E', dark: '#7A1646', soft: '#F7E7EF' },
        ink: '#1F1A2E',
        muted: '#6B6480',
        mist: '#FBF7F9',
        line: '#ECE3E9',
        lake: { DEFAULT: '#2A7A80', dark: '#1E5C61', soft: '#E3F1F1' },
        rec: '#D8322F',
        // Nombres anteriores: se mantienen como alias hasta terminar de limpiar el código viejo
        crema: '#FBF7F9',
        arena: '#ECE3E9',
        salvia: { DEFAULT: '#A8245E', dark: '#7A1646', soft: '#F7E7EF' },
        terracota: { DEFAULT: '#B3261E', soft: '#FDE8E7' },
        lila: '#D9B3C5',
        tinta: '#1F1A2E',
        suave: '#6B6480'
      },
      fontFamily: {
        sans: ['Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      borderRadius: { xl2: '1.375rem', xl3: '1.75rem' },
      boxShadow: { calma: '0 1px 2px rgba(31,26,46,0.05)', lift: '0 8px 20px rgba(31,26,46,0.18)' }
    }
  },
  plugins: []
};
