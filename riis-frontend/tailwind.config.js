import defaultTheme from 'tailwindcss/defaultTheme'

export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        background: '#ffffff',
        foreground: '#0b0f19',
        surface: '#f7f7f8',
        muted: '#6b7280',
        border: '#e5e7eb',
      },
      borderRadius: {
        md: '8px',
        lg: '12px',
      },
    },
  },
}
