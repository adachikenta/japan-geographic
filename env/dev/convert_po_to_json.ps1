$ErrorActionPreference = "Stop"
Write-Host "`nConverting translation files from PO to JSON..." -ForegroundColor Cyan

# Function to parse PO file and convert to JSON
function Convert-PoToJson {
    param(
        [string]$PoFilePath
    )

    $translations = @{}
    $currentMsgid = ""
    $currentMsgstr = ""
    $inMsgid = $false
    $inMsgstr = $false

    Get-Content $PoFilePath | ForEach-Object {
        $line = $_.Trim()

        # Skip empty lines and comments (except msgid/msgstr)
        if ($line -eq "" -or $line -match "^#(?!:)") {
            if ($currentMsgid -and $currentMsgstr) {
                $translations[$currentMsgid] = $currentMsgstr
                $currentMsgid = ""
                $currentMsgstr = ""
            }
            $inMsgid = $false
            $inMsgstr = $false
            return
        }

        # Match msgid
        if ($line -match '^msgid\s+"(.*)"\s*$') {
            if ($currentMsgid -and $currentMsgstr) {
                $translations[$currentMsgid] = $currentMsgstr
            }
            $currentMsgid = $matches[1]
            $currentMsgstr = ""
            $inMsgid = $true
            $inMsgstr = $false
        }
        # Match msgstr
        elseif ($line -match '^msgstr\s+"(.*)"\s*$') {
            $currentMsgstr = $matches[1]
            $inMsgid = $false
            $inMsgstr = $true
        }
        # Continuation of msgid or msgstr
        elseif ($line -match '^"(.*)"\s*$') {
            if ($inMsgid) {
                $currentMsgid += $matches[1]
            }
            elseif ($inMsgstr) {
                $currentMsgstr += $matches[1]
            }
        }
    }

    # Add last entry
    if ($currentMsgid -and $currentMsgstr) {
        $translations[$currentMsgid] = $currentMsgstr
    }

    # Remove empty msgid (header)
    $translations.Remove("")

    return $translations
}

# Create locales directory structure
$localesDir = ".\locales"
if (Test-Path $localesDir) {
    Write-Host "Removing existing locales directory..." -ForegroundColor Yellow
    Remove-Item -Path $localesDir -Recurse -Force
}
New-Item -Path $localesDir -ItemType Directory -Force | Out-Null

# Process each language
$languages = @("en", "ja")
$convertResult = 0

try {
    foreach ($lang in $languages) {
        $poFile = ".\translations\$lang\LC_MESSAGES\messages.po"

        if (-not (Test-Path $poFile)) {
            Write-Host "Warning: PO file not found: $poFile" -ForegroundColor Yellow
            continue
        }

        Write-Host "Converting $lang translations..." -ForegroundColor Yellow

        # Parse PO file
        $translations = Convert-PoToJson -PoFilePath $poFile

        # Create language directory
        $langDir = Join-Path $localesDir $lang
        New-Item -Path $langDir -ItemType Directory -Force | Out-Null

        # Write JSON file
        $jsonFile = Join-Path $langDir "common.json"
        $jsonContent = $translations | ConvertTo-Json -Depth 10
        Set-Content -Path $jsonFile -Value $jsonContent -Encoding UTF8

        Write-Host "Created: $jsonFile" -ForegroundColor Green
        Write-Host "  Translations: $($translations.Count)" -ForegroundColor Gray
    }

    # Create i18n configuration template
    Write-Host "`nCreating i18n configuration documentation..." -ForegroundColor Yellow
    $i18nDoc = @"
# i18n Configuration for Next.js

This project uses next-intl for internationalization.

## Directory Structure

\`\`\`
locales/
├── en/
│   └── common.json
└── ja/
    └── common.json
\`\`\`

## Setup Instructions

1. Install next-intl:
\`\`\`bash
cd frontend
pnpm add next-intl
\`\`\`

2. Create middleware.ts in frontend root:
\`\`\`typescript
import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'ja'],
  defaultLocale: 'ja'
});

export const config = {
  matcher: ['/((?!api|_next|.*\\\\..*).*)']
};
\`\`\`

3. Create i18n.ts configuration:
\`\`\`typescript
import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

const locales = ['en', 'ja'];

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as any)) notFound();

  return {
    messages: (await import(\`../locales/\${locale}/common.json\`)).default
  };
});
\`\`\`

## Usage in Components

\`\`\`typescript
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
\`\`\`

## Migration Notes

- All translations from Flask-Babel .po files have been converted to JSON
- The msgfmt command (from gettext) is no longer needed
- Translation keys remain the same for easier migration
"@

    $docFile = Join-Path $localesDir "README.md"
    Set-Content -Path $docFile -Value $i18nDoc -Encoding UTF8
    Write-Host "Created: $docFile" -ForegroundColor Green

    Write-Host "`nTranslation conversion completed successfully!" -ForegroundColor Green
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Move locales/ directory to frontend/ when it's created" -ForegroundColor White
    Write-Host "2. Install next-intl package in frontend" -ForegroundColor White
    Write-Host "3. Follow setup instructions in locales/README.md" -ForegroundColor White

} catch {
    $convertResult = 1
    Write-Host "Error during conversion: $_" -ForegroundColor Red
    Write-Host "Stack trace: $($_.ScriptStackTrace)" -ForegroundColor Red
} finally {
    exit $convertResult
}
