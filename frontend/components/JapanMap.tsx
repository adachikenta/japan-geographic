'use client';

import { useEffect, useRef, useState } from 'react';
import Map, { Source, Layer, NavigationControl, ScaleControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { LayerProps } from 'react-map-gl/maplibre';

interface JapanMapProps {
  geojsonUrl?: string;
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
}

// 都道府県レイヤースタイル
const prefectureLayerStyle: LayerProps = {
  id: 'prefecture-fills',
  type: 'fill',
  paint: {
    'fill-color': '#088',
    'fill-opacity': 0.3,
  },
};

const prefectureBorderStyle: LayerProps = {
  id: 'prefecture-borders',
  type: 'line',
  paint: {
    'line-color': '#088',
    'line-width': 2,
  },
};

const prefectureLabelStyle: LayerProps = {
  id: 'prefecture-labels',
  type: 'symbol',
  layout: {
    'text-field': ['get', 'prefName'],
    'text-size': 14,
    'text-font': ['Noto Sans Regular'],
  },
  paint: {
    'text-color': '#000',
    'text-halo-color': '#fff',
    'text-halo-width': 2,
  },
};

export default function JapanMap({ geojsonUrl, initialViewState }: JapanMapProps) {
  const mapRef = useRef<any>(null);
  const [geojsonData, setGeojsonData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // デフォルトの視点設定（日本全体）
  const defaultViewState = {
    longitude: 138.0,
    latitude: 37.0,
    zoom: 5,
  };

  // GeoJSONデータの取得
  useEffect(() => {
    if (!geojsonUrl) return;

    const fetchGeoJSON = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(geojsonUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch GeoJSON: ${response.statusText}`);
        }
        const data = await response.json();
        setGeojsonData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error fetching GeoJSON:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGeoJSON();
  }, [geojsonUrl]);

  return (
    <div className="relative w-full h-full">
      {/* ローディング表示 */}
      {loading && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white px-4 py-2 rounded-lg shadow-md">
          <p className="text-sm">データを読み込み中...</p>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg shadow-md">
          <p className="text-sm font-semibold">エラー</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* マップ */}
      <Map
        ref={mapRef}
        initialViewState={initialViewState || defaultViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://tile.openstreetmap.jp/styles/osm-bright-ja/style.json"
        attributionControl={true}
      >
        {/* ナビゲーションコントロール */}
        <NavigationControl position="top-right" />

        {/* スケールコントロール */}
        <ScaleControl position="bottom-left" unit="metric" />

        {/* GeoJSONレイヤー */}
        {geojsonData && (
          <Source id="prefecture-data" type="geojson" data={geojsonData}>
            <Layer {...prefectureLayerStyle} />
            <Layer {...prefectureBorderStyle} />
            <Layer {...prefectureLabelStyle} />
          </Source>
        )}
      </Map>
    </div>
  );
}
