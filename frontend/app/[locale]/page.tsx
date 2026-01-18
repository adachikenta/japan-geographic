'use client';

import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useState } from 'react';
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
  const [overlayLayer, setOverlayLayer] = useState('none');
  const [checkboxLayers, setCheckboxLayers] = useState<Set<string>>(new Set());
  const [showTerrain, setShowTerrain] = useState(false);
  const [showTileBoundaries, setShowTileBoundaries] = useState(false);
  const [sizeScale, setSizeScale] = useState(1.0); // 円サイズ調整用
  const [sphereSizeScale, setSphereSizeScale] = useState(1.0); // 球サイズ調整用

  const toggleCheckboxLayer = (layerKey: string) => {
    setCheckboxLayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(layerKey)) {
        newSet.delete(layerKey);
      } else {
        newSet.add(layerKey);
      }
      return newSet;
    });
  };

  return (
    <div className="relative h-screen overflow-hidden overflow-x-hidden">
      {/* メインエリア（地図）- 常にフルサイズ */}
      <main className="w-full h-full">
        <JapanMap
          overlayLayer={overlayLayer}
          checkboxLayers={checkboxLayers}
          showTerrain={showTerrain}
          showTileBoundaries={showTileBoundaries}
          sizeScale={sizeScale}
          sphereSizeScale={sphereSizeScale}
        />
      </main>

      {/* 左サイドバー - 地図の上にオーバーレイ */}
      <div className="absolute top-0 left-0 h-full z-10">
        <Sidebar
          overlayLayer={overlayLayer}
          onOverlayLayerChange={setOverlayLayer}
          checkboxLayers={checkboxLayers}
          onCheckboxLayerToggle={toggleCheckboxLayer}
          showTerrain={showTerrain}
          onTerrainChange={setShowTerrain}
          showTileBoundaries={showTileBoundaries}
          onTileBoundariesChange={setShowTileBoundaries}
          sizeScale={sizeScale}
          onSizeScaleChange={setSizeScale}
          sphereSizeScale={sphereSizeScale}
          onSphereSizeScaleChange={setSphereSizeScale}
        />
      </div>
    </div>
  );
}
