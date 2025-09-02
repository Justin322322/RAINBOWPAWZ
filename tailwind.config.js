/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./public/**/*.html",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '475px', // iPhone 12 Pro and similar small devices
      },
      colors: {
        primary: {
          DEFAULT: '#1b5345',
          light: '#246b58',
          dark: '#0f3c32',
        },
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
        '999': '999',
        '9999': '9999',
        '99999': '99999',
        '999999': '999999',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'scale(0.98)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
        fadeOut: {
          '0%': { opacity: 1, transform: 'scale(1)' },
          '100%': { opacity: 0, transform: 'scale(0.98)' },
        },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: 1, transform: 'translateY(0)' },
          '100%': { opacity: 0, transform: 'translateY(10px)' },
        },
        modalAppear: {
          '0%': { opacity: 0, transform: 'scale(0.98) translateY(5px)' },
          '100%': { opacity: 1, transform: 'scale(1) translateY(0)' },
        },
        optimizedPulse: {
          '0%, 100%': { opacity: 0.7 },
          '50%': { opacity: 1 },
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.15s ease-out',
        fadeOut: 'fadeOut 0.15s ease-out',
        slideUp: 'slideUp 0.2s ease-out',
        slideDown: 'slideDown 0.2s ease-out',
        'modal-appear': 'modalAppear 0.15s ease-out',
        'optimized-pulse': 'optimizedPulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};