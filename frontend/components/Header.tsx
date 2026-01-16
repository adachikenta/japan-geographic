'use client';

import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';

export default function Header() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();

  const changeLanguage = (newLocale: string) => {
    const currentLocale = pathname.split('/')[1];
    const newPath = pathname.replace(`/${currentLocale}`, `/${newLocale}`);
    router.push(newPath);
  };

  return (
    <header className="bg-primary text-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16 flex-wrap">
          {/* Logo */}
          <div className="flex items-center gap-5">
            <div className="font-bold text-xl">
              {t('system')}
            </div>
            <nav className="hidden md:flex gap-5">
              <a
                href="#"
                className="hover:bg-white/10 px-3 py-2 rounded transition-colors"
              >
                {t('home')}
              </a>
              <a
                href="#"
                className="hover:bg-white/10 px-3 py-2 rounded transition-colors"
              >
                {t('page')}
              </a>
            </nav>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-3">
            <select
              className="bg-white/90 text-primary border border-white rounded px-3 py-1.5 text-sm cursor-pointer hover:bg-white transition-colors"
              onChange={(e) => changeLanguage(e.target.value)}
              defaultValue={pathname.split('/')[1]}
            >
              <option value="ja">日本語</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}
