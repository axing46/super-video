/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#121212',
        paper: 'rgba(30, 30, 30, 0.9)',
        ink: '#f5f5f7',
        'ink-2': '#8e8e93',
        muted: '#6e6e73',
        hair: 'rgba(255,255,255,0.1)',
        'hair-2': 'rgba(255,255,255,0.15)',
        accent: {
          DEFAULT: '#1A6DBF',
          hover: '#1a5aa0',
          rgb: '26,109,191',
        },
        blue: '#1A6DBF',
        warm: '#f5f5f7',
        champagne: {
          DEFAULT: '#f4d28a',
          deep: '#9a6f2c',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'ui-monospace', 'monospace'],
        display: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        'card': '1.5rem',
        'tile': '1.5rem',
        'btn': '1.5rem',
        'search': '1.5rem',
        'modal': '1.5rem',
        'cover': '1.5rem',
        'cover-sm': '0.75rem',
        'pill': '9999px',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0,0,0,.3)',
        'md': '0 4px 6px rgba(0,0,0,.3)',
        'card': '0 1px 2px rgba(0,0,0,.3)',
        'card-hover': '0 4px 6px rgba(0,0,0,.4)',
      },
      backdropBlur: {
        'glass': '12px',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0,0,0.2,1)',
      },
      animation: {
        'float': 'float 7.4s ease-in-out infinite',
        'fade-up': 'fadeUp 0.45s cubic-bezier(.16,1,.3,1) forwards',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        skeleton: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
