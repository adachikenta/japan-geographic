'use client';

import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';

// JapanMapをクライアントサイドのみで読み込む
const JapanMap = dynamic(() => import('@/components/JapanMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <p className="text-gray-600">マップを読み込み中...</p>
    </div>
  ),
});

export default function HomePage() {
  const t = useTranslations('');

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 左サイドバー */}
      <Sidebar />

      {/* メインエリア（地図） */}
      <main className="flex-1 relative">
        <JapanMap />
      </main>
    </div>
  );
}
