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
        background: 'rgb(var(--background) / <alpha-value>)',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        'muted-foreground': 'rgb(var(--muted-foreground) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        'accent-foreground': 'rgb(var(--accent-foreground) / <alpha-value>)',
        input: 'rgb(var(--input) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'sans-serif'],
      },
      typography: ({ theme }) => ({
        kontxt: {
          css: {
            '--tw-prose-body': 'rgb(var(--foreground) / 0.9)',
            '--tw-prose-headings': theme('colors.foreground'),
            '--tw-prose-lead': theme('colors.muted-foreground'),
            '--tw-prose-links': theme('colors.primary'),
            '--tw-prose-bold': theme('colors.foreground'),
            '--tw-prose-counters': theme('colors.primary'),
            '--tw-prose-bullets': theme('colors.primary'),
            '--tw-prose-hr': theme('colors.muted'),
            '--tw-prose-quotes': theme('colors.foreground'),
            '--tw-prose-quote-borders': theme('colors.primary'),
            '--tw-prose-captions': theme('colors.muted-foreground'),
            '--tw-prose-code': theme('colors.primary'),
            '--tw-prose-pre-code': theme('colors.foreground'),
            '--tw-prose-pre-bg': 'transparent',
            '--tw-prose-th-borders': theme('colors.muted'),
            '--tw-prose-td-borders': theme('colors.muted'),
            h1: {
              fontWeight: '900',
              letterSpacing: '-0.04em',
              lineHeight: '1.1',
            },
            h2: {
              fontWeight: '700',
              letterSpacing: '-0.03em',
              marginTop: '2.5em',
              marginBottom: '1em',
              lineHeight: '1.2',
            },
            h3: {
              fontWeight: '600',
              letterSpacing: '-0.01em',
              marginTop: '2em',
              marginBottom: '0.75em',
              lineHeight: '1.3',
            },
            p: {
              lineHeight: '1.85',
              marginTop: '1.5em',
              marginBottom: '1.5em',
              fontSize: '1.05rem',
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
