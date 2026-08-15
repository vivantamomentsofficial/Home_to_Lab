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
        // Soft Light-Blue and Midnight palette
        brand: {
          bg: {
            light: '#F0F4F8',
            dark: '#0B0F19',
          },
          panel: {
            light: '#FFFFFF',
            dark: '#111827',
          },
          border: {
            light: 'rgba(14, 165, 233, 0.12)',
            dark: 'rgba(14, 165, 233, 0.15)',
          },
          primary: {
            DEFAULT: '#0284C7', // Sky-600
            hover: '#0369A1',   // Sky-700
            light: '#0EA5E9',   // Sky-500
          },
          muted: '#64748B',      // Slate-500
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'fade-out': 'fadeOut 0.2s ease-in forwards',
        'scale-up': 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        scaleUp: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
