/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        nexora: {
          bg: '#090d16',
          surface: '#111726',
          elevated: '#172033',
          border: '#1e293b',
          muted: '#64748b',
          text: '#f8fafc',
          subtext: '#94a3b8',
          primary: '#6366f1',
          primaryHover: '#4f46e5',
          accent: '#06b6d4',
          accentHover: '#0891b2',
          success: '#10b981',
          warning: '#f59e0b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 25px -5px rgba(99, 102, 241, 0.25)',
        glowCyan: '0 0 25px -5px rgba(6, 182, 212, 0.25)',
      }
    },
  },
  plugins: [],
}
