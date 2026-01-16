# i18n Configuration for Next.js

This project uses next-intl for internationalization.

## Directory Structure

\\\
locales/
├── en/
│   └── common.json
└── ja/
    └── common.json
\\\

## Setup Instructions

1. Install next-intl:
\\\ash
cd frontend
pnpm add next-intl
\\\

2. Create middleware.ts in frontend root:
\\\	ypescript
import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'ja'],
  defaultLocale: 'ja'
});

export const config = {
  matcher: ['/((?!api|_next|.*\\\\..*).*)']
};
\\\

3. Create i18n.ts configuration:
\\\	ypescript
import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

const locales = ['en', 'ja'];

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as any)) notFound();

  return {
    messages: (await import(\../locales/\/common.json\)).default
  };
});
\\\

## Usage in Components

\\\	ypescript
import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations();

  return (
    <div>
      <h1>{t('system')}</h1>
      <p>{t('home')}</p>
    </div>
  );
}
\\\

## Migration Notes

- All translations from Flask-Babel .po files have been converted to JSON
- The msgfmt command (from gettext) is no longer needed
- Translation keys remain the same for easier migration
