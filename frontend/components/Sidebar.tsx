'use client';

import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { OVERLAY_LAYERS, CHECKBOX_LAYERS, POPULATION_CHECKBOX_LAYERS } from '@/lib/mapLayers';

interface SidebarProps {
  overlayLayer: string;
  onOverlayLayerChange: (layer: string) => void;
  checkboxLayers: Set<string>;
  onCheckboxLayerToggle: (layer: string) => void;
  showTerrain: boolean;
  onTerrainChange: (show: boolean) => void;
  showTileBoundaries: boolean;
  onTileBoundariesChange: (show: boolean) => void;
}

type TabType = 'map' | 'settings' | 'help';

export default function Sidebar({
  overlayLayer,
  onOverlayLayerChange,
  checkboxLayers,
  onCheckboxLayerToggle,
  showTerrain,
  onTerrainChange,
  showTileBoundaries,
  onTileBoundariesChange,
}: SidebarProps) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('map');

  const changeLanguage = (newLocale: string) => {
    const currentLocale = pathname.split('/')[1];
    const newPath = pathname.replace(`/${currentLocale}`, `/${newLocale}`);
    router.push(newPath);
  };

  return (
    <>
      {/* 折りたたみボタン（サイドバーが閉じているとき） */}
      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="fixed top-4 left-4 z-50 bg-primary text-white p-2 rounded-lg shadow-lg hover:bg-primary/90 transition-colors"
          aria-label="サイドバーを開く"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* サイドバー */}
      <aside className={`h-full w-80 bg-primary text-white flex flex-col shadow-lg transition-all duration-300 ${
        isCollapsed ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'
      } overflow-y-auto overflow-x-hidden`}>
        {/* ヘッダー部分 */}
        <div className="flex-shrink-0">
          <div className="flex items-center justify-between px-6 py-4">
            <h1 className="text-lg font-semibold tracking-wide whitespace-nowrap">{t('system')}</h1>
            <button
              onClick={() => setIsCollapsed(true)}
              className="hover:bg-white/10 p-1 rounded transition-colors"
              aria-label="サイドバーを閉じる"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* タブナビゲーション */}
          <div className="flex justify-start border-b border-white/20">
            <button
              onClick={() => setActiveTab('map')}
              title="レイヤー設定"
              className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                activeTab === 'map' ? 'bg-white/15 border-b-2 border-white' : 'hover:bg-white/5'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span>レイヤー</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              title="設定"
              className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                activeTab === 'settings' ? 'bg-white/15 border-b-2 border-white' : 'hover:bg-white/5'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>設定</span>
            </button>
            <button
              onClick={() => setActiveTab('help')}
              title="ヘルプ"
              className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                activeTab === 'help' ? 'bg-white/15 border-b-2 border-white' : 'hover:bg-white/5'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>ヘルプ</span>
            </button>
          </div>
        </div>

      {/* タブコンテンツ */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* 🗺️ レイヤー選択タブ */}
        {activeTab === 'map' && (
          <div className="space-y-3">
            {/* 土地被覆・土地利用 */}
            <div className="flex flex-col gap-0.5">
              {Object.entries(OVERLAY_LAYERS).map(([key, layer]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 cursor-pointer hover:bg-white/10 rounded px-2 py-1.5 transition-colors"
                  title={'tooltip' in layer ? layer.tooltip : undefined}
                >
                  <input
                    type="radio"
                    name="overlay"
                    value={key}
                    checked={overlayLayer === key}
                    onChange={(e) => onOverlayLayerChange(e.target.value)}
                    className="w-4 h-4 text-blue-500 flex-shrink-0"
                  />
                  <span className="text-sm flex-1">{layer.name}</span>
                  {'scale' in layer && layer.scale && (
                    <span className="text-xs text-white/60 flex-shrink-0">{layer.scale}</span>
                  )}
                </label>
              ))}
            </div>

            {/* 区切り線（ラジオボタンとチェックボックスの間のみ） */}
            <div className="border-t border-white/20"></div>

            {/* 追加レイヤー */}
            <div className="flex flex-col gap-0.5">
              {Object.entries(CHECKBOX_LAYERS).map(([key, layer]) => {
                // 人口レイヤーは表形式で表示するのでスキップ
                if (key.startsWith('population')) {
                  return null;
                }

                // terrain と tileBoundaries は特別な処理
                if (key === 'terrain') {
                  return (
                    <label
                      key={key}
                      className="flex items-center gap-2 cursor-pointer hover:bg-white/10 rounded px-2 py-1.5 transition-colors"
                      title={'tooltip' in layer ? layer.tooltip : undefined}
                    >
                      <input
                        type="checkbox"
                        checked={showTerrain}
                        onChange={(e) => onTerrainChange(e.target.checked)}
                        className="w-4 h-4 text-blue-500 rounded flex-shrink-0"
                      />
                      <span className="text-sm flex-1">{layer.name}</span>
                      {layer.scale && (
                        <span className="text-xs text-white/60 flex-shrink-0">{layer.scale}</span>
                      )}
                    </label>
                  );
                }
                if (key === 'tileBoundaries') {
                  return (
                    <label
                      key={key}
                      className="flex items-center gap-2 cursor-pointer hover:bg-white/10 rounded px-2 py-1.5 transition-colors"
                      title={'tooltip' in layer ? layer.tooltip : undefined}
                    >
                      <input
                        type="checkbox"
                        checked={showTileBoundaries}
                        onChange={(e) => onTileBoundariesChange(e.target.checked)}
                        className="w-4 h-4 text-blue-500 rounded flex-shrink-0"
                      />
                      <span className="text-sm flex-1">{layer.name}</span>
                      {layer.scale && (
                        <span className="text-xs text-white/60 flex-shrink-0">{layer.scale}</span>
                      )}
                    </label>
                  );
                }
                // 通常のレイヤー
                return (
                  <label
                    key={key}
                    className="flex items-center gap-2 cursor-pointer hover:bg-white/10 rounded px-2 py-1.5 transition-colors"
                    title={'tooltip' in layer ? layer.tooltip : undefined}
                  >
                    <input
                      type="checkbox"
                      checked={checkboxLayers.has(key)}
                      onChange={() => onCheckboxLayerToggle(key)}
                      className="w-4 h-4 text-blue-500 rounded flex-shrink-0"
                    />
                    <span className="text-sm flex-1">{layer.name}</span>
                    {layer.scale && (
                      <span className="text-xs text-white/60 flex-shrink-0">{layer.scale}</span>
                    )}
                  </label>
                );
              })}
            </div>

            {/* 人口レイヤー（表形式） */}
            <div className="mt-3 bg-white/5 rounded p-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-1 px-1 font-normal text-white/80">
                      <span className="text-sm">人口 - 全域</span>
                    </th>
                    <th className="text-center py-1 px-1 font-normal text-white/80">円</th>
                    <th className="text-center py-1 px-1 font-normal text-white/80">ドーム</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/10">
                    <td className="py-1.5 px-1 text-white/90">都道府県</td>
                    <td className="py-1.5 px-1 text-center">
                      <input
                        type="checkbox"
                        checked={checkboxLayers.has('populationPrefecture')}
                        onChange={() => onCheckboxLayerToggle('populationPrefecture')}
                        className="w-4 h-4 text-blue-500 rounded cursor-pointer"
                        title="都道府県別人口を円の大きさで表現"
                      />
                    </td>
                    <td className="py-1.5 px-1 text-center">
                      <input
                        type="checkbox"
                        checked={checkboxLayers.has('populationPrefecture3d')}
                        onChange={() => onCheckboxLayerToggle('populationPrefecture3d')}
                        className="w-4 h-4 text-blue-500 rounded cursor-pointer"
                        title="都道府県別人口を3D柱状で表現（高負荷）"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-1 text-white/90">市区町村</td>
                    <td className="py-1.5 px-1 text-center">
                      <input
                        type="checkbox"
                        checked={checkboxLayers.has('populationCity')}
                        onChange={() => onCheckboxLayerToggle('populationCity')}
                        className="w-4 h-4 text-blue-500 rounded cursor-pointer"
                        title="主要都市の人口を円の大きさで表現"
                      />
                    </td>
                    <td className="py-1.5 px-1 text-center">
                      <input
                        type="checkbox"
                        checked={checkboxLayers.has('populationCity3d')}
                        onChange={() => onCheckboxLayerToggle('populationCity3d')}
                        className="w-4 h-4 text-blue-500 rounded cursor-pointer"
                        title="主要都市の人口を3D柱状で表現（高負荷）"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ⚙️ 設定タブ */}
        {activeTab === 'settings' && (
          <div>
            <h3 className="text-xs font-semibold mb-2 text-white/90 uppercase tracking-wider">言語 / Language</h3>
            <select
              className="w-full bg-white text-primary border border-white rounded px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 transition-colors"
              onChange={(e) => changeLanguage(e.target.value)}
              defaultValue={pathname.split('/')[1]}
            >
              <option value="ja">日本語</option>
              <option value="en">English</option>
            </select>
          </div>
        )}

        {/* ❔ ヘルプタブ */}
        {activeTab === 'help' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-semibold mb-2 text-white/90 uppercase tracking-wider">使い方</h3>
              <div className="text-sm text-white/80 space-y-2">
                <p>🗺️ <strong>レイヤータブ</strong>: 地図上に表示する情報を選択できます。</p>
                <p className="pl-4">• 土地被覆・土地利用から1つ選択</p>
                <p className="pl-4">• 追加レイヤーは複数選択可能</p>
                <p className="pl-4">• 地形表現で標高の陰影を表示</p>
                <div className="border-t border-white/20 my-3"></div>
                <p>⚙️ <strong>設定タブ</strong>: 言語を切り替えできます。</p>
                <div className="border-t border-white/20 my-3"></div>
                <p>📱 <strong>操作方法</strong>:</p>
                <p className="pl-4">• マウスドラッグ: 地図を移動</p>
                <p className="pl-4">• スクロール: ズーム</p>
                <p className="pl-4">• 左上の「←」ボタン: サイドバーを格納</p>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold mb-2 text-white/90 uppercase tracking-wider">バージョン情報</h3>
              <div className="text-sm text-white/80 space-y-1">
                <p><strong>Japan Geographic</strong></p>
                <p>Version 1.0.0</p>
                <p className="text-xs text-white/60 mt-3">© 2026 Japan Geographic</p>
                <p className="text-xs text-white/60">All rights reserved</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}
