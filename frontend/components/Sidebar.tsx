'use client';

import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Sidebar() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const [showHelp, setShowHelp] = useState(false);

  const changeLanguage = (newLocale: string) => {
    const currentLocale = pathname.split('/')[1];
    const newPath = pathname.replace(`/${currentLocale}`, `/${newLocale}`);
    router.push(newPath);
  };

  return (
    <aside className="w-64 bg-primary text-white flex flex-col shadow-lg">
      {/* ヘッダー部分 */}
      <div className="p-6 border-b border-white/20">
        <h1 className="text-2xl font-bold mb-4">{t('system')}</h1>

        {/* 言語選択 */}
        <div>
          <label className="block text-sm mb-2">言語 / Language</label>
          <select
            className="w-full bg-white/90 text-primary border border-white rounded px-3 py-2 text-sm cursor-pointer hover:bg-white transition-colors"
            onChange={(e) => changeLanguage(e.target.value)}
            defaultValue={pathname.split('/')[1]}
          >
            <option value="ja">日本語</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 p-4 space-y-2">
        <a
          href="#"
          className="block hover:bg-white/10 px-4 py-3 rounded transition-colors"
        >
          {t('home')}
        </a>
        <a
          href="#"
          className="block hover:bg-white/10 px-4 py-3 rounded transition-colors"
        >
          {t('page')}
        </a>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-full text-left hover:bg-white/10 px-4 py-3 rounded transition-colors"
        >
          ヘルプ
        </button>

        {showHelp && (
          <div className="ml-4 p-4 bg-white/5 rounded text-sm space-y-2">
            <p className="text-white/80">© 2026 Japan Geographic</p>
            <p className="text-white/80">All rights reserved</p>
          </div>
        )}
      </nav>
    </aside>
  );
}
