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

// マップスタイル定義
const MAP_STYLES = {
  standard: {
    name: '標準地図',
    url: 'https://tile.openstreetmap.jp/styles/osm-bright-ja/style.json',
  },
} as const;

// オーバーレイレイヤー定義
const OVERLAY_LAYERS = {
  none: { name: 'なし' },
  landcover1: { name: '被覆 - OpenStreetMap', url: '/landcover-style.json', scale: '～30km' },
  landcover2: { name: '被覆 - 国土数値情報', url: '/landcover2-style.json', scale: '～30km' },
  landcover3: { name: '被覆 - ESA WorldCover', url: '/landcover3-style.json', scale: '～30km' },
  landuse1: { name: '用途 - 国土数値情報（詳細）', url: '/landuse1-style.json', scale: '～50km, 100km～' },
  landuse2: { name: '用途 - 国土数値情報（簡易）', url: '/landuse2-style.json', scale: '～50km, 100km～' },
  landuse3: { name: '用途 - 都市計画基礎調査', url: '/landuse3-style.json', scale: '～1km' },
} as const;

type OverlayType = keyof typeof OVERLAY_LAYERS;

// チェックボックスレイヤー定義（複数選択可能）
const CHECKBOX_LAYERS = {
  urban: { name: '都市域（簡易）', url: '/urban-overlay.json', scale: '100km以上', description: '市街地系（住宅+商業+工業）の統合表示' },
} as const;

type CheckboxLayerType = keyof typeof CHECKBOX_LAYERS;

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
  const [overlayLayer, setOverlayLayer] = useState<OverlayType>('none');
  const [showTerrain, setShowTerrain] = useState(false);
  const [checkboxLayers, setCheckboxLayers] = useState<Set<CheckboxLayerType>>(new Set());
  const [currentZoom, setCurrentZoom] = useState<number>(initialViewState?.zoom || 5);
  const [showTileBoundaries, setShowTileBoundaries] = useState(false);

  // デフォルトの視点設定（日本全体）
  const defaultViewState = {
    longitude: 138.0,
    latitude: 37.0,
    zoom: 5,
  };

  // ズームレベルの更新
  const handleZoomChange = () => {
    const map = mapRef.current?.getMap();
    if (map) {
      setCurrentZoom(map.getZoom());
    }
  };

  // タイル境界表示の切り替え
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (map) {
      map.showTileBoundaries = showTileBoundaries;
    }
  }, [showTileBoundaries]);

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

  // 標高レイヤーの追加/削除
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current.getMap();
    if (!map) return;

    if (showTerrain) {
      // 地形データソースを追加
      if (!map.getSource('terrarium')) {
        map.addSource('terrarium', {
          type: 'raster-dem',
          tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
          encoding: 'terrarium',
          tileSize: 256,
        });
      }

      // 陰影起伏レイヤーを追加（最初のシンボルレイヤーの前に挿入）
      if (!map.getLayer('hillshade')) {
        // ラベルレイヤーの前に挿入するため、最初のシンボルレイヤーを探す
        const layers = map.getStyle().layers;
        const firstSymbolId = layers?.find((layer: any) => layer.type === 'symbol')?.id;

        map.addLayer({
          id: 'hillshade',
          type: 'hillshade',
          source: 'terrarium',
          paint: {
            'hillshade-exaggeration': 0.8,
            'hillshade-shadow-color': '#3d2817',
            'hillshade-illumination-direction': 315,
            'hillshade-highlight-color': '#FFFFFF',
          },
        }, firstSymbolId);
      }
    } else {
      // 陰影起伏レイヤーを削除
      if (map.getLayer('hillshade')) {
        map.removeLayer('hillshade');
      }
      if (map.getSource('terrarium')) {
        map.removeSource('terrarium');
      }
    }
  }, [showTerrain]);

  // オーバーレイレイヤーの管理
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !map.isStyleLoaded()) return;

    // 既存のオーバーレイレイヤーとソースをすべて削除
    const style = map.getStyle();
    const overlayLayerIds = style.layers
      ?.filter((layer: any) => layer.id.startsWith('landcover-') || layer.id.startsWith('landuse-'))
      .map((layer: any) => layer.id) || [];

    overlayLayerIds.forEach((id: string) => {
      if (map.getLayer(id)) {
        map.removeLayer(id);
      }
    });

    // オーバーレイソースを削除
    ['landcover-tiles', 'landuse-data'].forEach(sourceId => {
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    });

    // 新しいオーバーレイレイヤーを追加（"none"以外の場合）
    if (overlayLayer !== 'none' && OVERLAY_LAYERS[overlayLayer].url) {
      // オーバーレイスタイルを読み込んで適用
      fetch(OVERLAY_LAYERS[overlayLayer].url!)
        .then(res => res.json())
        .then(overlayStyle => {
          console.log('Loading overlay style:', overlayLayer, overlayStyle);

          // オーバーレイスタイルのソースを追加
          if (overlayStyle.sources) {
            Object.entries(overlayStyle.sources).forEach(([sourceId, sourceConfig]: [string, any]) => {
              if (!map.getSource(sourceId)) {
                console.log('Adding source:', sourceId);
                map.addSource(sourceId, sourceConfig);
              }
            });
          }

          if (overlayStyle.layers) {
            overlayStyle.layers.forEach((layer: any) => {
              // 背景レイヤーはスキップ
              if (layer.type === 'background') return;

              // 透過度を濃い目に設定（80%の不透明度）
              const layerWithOpacity = {
                ...layer,
                paint: {
                  ...layer.paint,
                  ...(layer.type === 'fill' && {
                    'fill-opacity': 0.8
                  }),
                  ...(layer.type === 'line' && {
                    'line-opacity': 0.9
                  }),
                }
              };

              if (!map.getLayer(layer.id)) {
                console.log('Adding layer:', layer.id);
                map.addLayer(layerWithOpacity);
              }
            });
          }
        })
        .catch(err => {
          console.error('Error loading overlay style:', err);
          setError(`オーバーレイの読み込みに失敗しました: ${err.message}`);
        });
    }
  }, [overlayLayer]);

  // チェックボックスレイヤーの管理
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !map.isStyleLoaded()) {
      console.log('Map not ready or style not loaded');
      return;
    }

    console.log('Managing checkbox layers, current set:', Array.from(checkboxLayers));

    // すべてのチェックボックスレイヤーを確認
    const processLayers = async () => {
      for (const layerKey of Object.keys(CHECKBOX_LAYERS)) {
        const layer = CHECKBOX_LAYERS[layerKey as CheckboxLayerType];
        const isEnabled = checkboxLayers.has(layerKey as CheckboxLayerType);
        const vectorSourceId = `checkbox-${layerKey}-vector`;
        const vectorFillLayerId = `${vectorSourceId}-fill`;
        const vectorOutlineLayerId = `${vectorSourceId}-outline`;
        const geojsonSourceId = `checkbox-${layerKey}-geojson`;
        const geojsonFillLayerId = `${geojsonSourceId}-fill`;
        const geojsonOutlineLayerId = `${geojsonSourceId}-outline`;

        console.log(`Processing layer ${layerKey}, enabled: ${isEnabled}`);

        if (isEnabled) {
          // zoom 0-5用：ベクタータイルソース（低ズームレベルの粗いデータ）
          if (!map.getSource(vectorSourceId)) {
            console.log(`Adding vector tile source for zoom 0-5: ${vectorSourceId}`);
            map.addSource(vectorSourceId, {
              type: 'vector',
              tiles: ['https://tile.openstreetmap.jp/data/planet/{z}/{x}/{y}.pbf'],
              minzoom: 0,
              maxzoom: 14
            });
          }

          // zoom 6+用：静的GeoJSONソース（zoom=5のデータを固定表示）
          if (!map.getSource(geojsonSourceId)) {
            console.log(`Loading GeoJSON for high zoom: ${geojsonSourceId}`);
            try {
              const response = await fetch('/urban-areas-coarse.json');
              const geojsonData = await response.json();
              map.addSource(geojsonSourceId, {
                type: 'geojson',
                data: geojsonData
              });
              console.log(`  ✓ GeoJSON source loaded`);
            } catch (error) {
              console.error(`Failed to load GeoJSON for ${layerKey}:`, error);
            }
          }

          // レイヤーを追加
          const layers = map.getStyle().layers;
          const firstSymbolId = layers?.find((layer: any) => layer.type === 'symbol')?.id;

          // zoom 0-5用：ベクタータイルレイヤー（粗い大きなポリゴン）
          if (!map.getLayer(vectorFillLayerId)) {
            console.log(`Adding vector layer for zoom 0-5: ${vectorFillLayerId}`);
            map.addLayer({
              id: vectorFillLayerId,
              type: 'fill',
              source: vectorSourceId,
              'source-layer': 'landuse',
              filter: ['in', 'class', 'residential', 'commercial', 'industrial'],
              minzoom: 0,
              maxzoom: 6,  // zoom 5まで表示
              paint: {
                'fill-color': '#e0c0c0',
                'fill-opacity': 0.7
              }
            }, firstSymbolId);
            console.log(`  ✓ Vector fill layer added (zoom 0-5)`);
          }

          if (!map.getLayer(vectorOutlineLayerId)) {
            map.addLayer({
              id: vectorOutlineLayerId,
              type: 'line',
              source: vectorSourceId,
              'source-layer': 'landuse',
              filter: ['in', 'class', 'residential', 'commercial', 'industrial'],
              minzoom: 0,
              maxzoom: 6,  // zoom 5まで表示
              paint: {
                'line-color': '#b09090',
                'line-width': 0.5,
                'line-opacity': 0.5
              }
            }, firstSymbolId);
            console.log(`  ✓ Vector outline layer added (zoom 0-5)`);
          }

          // zoom 6+用：静的GeoJSONレイヤー（zoom=5データの固定表示）
          if (!map.getLayer(geojsonFillLayerId)) {
            console.log(`Adding GeoJSON layer for zoom 6+: ${geojsonFillLayerId}`);
            map.addLayer({
              id: geojsonFillLayerId,
              type: 'fill',
              source: geojsonSourceId,
              minzoom: 6,  // zoom 6から表示（zoom=5の粗いデータを維持）
              paint: {
                'fill-color': '#e0c0c0',
                'fill-opacity': 0.7
              }
            }, firstSymbolId);
            console.log(`  ✓ GeoJSON fill layer added (zoom 6+)`);
          }

          if (!map.getLayer(geojsonOutlineLayerId)) {
            map.addLayer({
              id: geojsonOutlineLayerId,
              type: 'line',
              source: geojsonSourceId,
              minzoom: 6,  // zoom 6から表示
              paint: {
                'line-color': '#b09090',
                'line-width': 0.5,
                'line-opacity': 0.5
              }
            }, firstSymbolId);
            console.log(`  ✓ GeoJSON outline layer added (zoom 6+)`);
          }

          console.log(`Successfully added layers: ${layerKey}`);
        } else {
          // レイヤーを削除（ベクタータイル + GeoJSONの両方）
          [vectorOutlineLayerId, vectorFillLayerId, geojsonOutlineLayerId, geojsonFillLayerId].forEach(layerId => {
            if (map.getLayer(layerId)) {
              console.log(`Removing layer: ${layerId}`);
              map.removeLayer(layerId);
            }
          });

          if (map.getSource(vectorSourceId)) {
            console.log(`Removing source: ${vectorSourceId}`);
            map.removeSource(vectorSourceId);
          }

          if (map.getSource(geojsonSourceId)) {
            console.log(`Removing source: ${geojsonSourceId}`);
            map.removeSource(geojsonSourceId);
          }
        }
      }
    };

    processLayers();
  }, [checkboxLayers]);

  // チェックボックスレイヤーのトグル
  const toggleCheckboxLayer = (layerKey: CheckboxLayerType) => {
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
    <div className="relative w-full h-full">
      {/* コントロールパネル */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        {/* オーバーレイレイヤー選択 */}
        <div className="bg-white rounded-lg shadow-md p-3">
          <div className="text-xs font-semibold text-gray-700 mb-2">土地被覆・土地利用</div>
          <div className="flex flex-col gap-1">
            {Object.entries(OVERLAY_LAYERS).map(([key, layer]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded p-1">
                <input
                  type="radio"
                  name="overlay"
                  value={key}
                  checked={overlayLayer === key}
                  onChange={(e) => setOverlayLayer(e.target.value as OverlayType)}
                  className="w-4 h-4 text-blue-500 flex-shrink-0"
                />
                <span className="text-sm text-gray-700 flex-1 min-w-0">{layer.name}</span>
                {'scale' in layer && layer.scale && (
                  <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0 ml-1">{layer.scale}</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* 追加レイヤー（チェックボックス） */}
        <div className="bg-white rounded-lg shadow-md p-3">
          <div className="text-xs font-semibold text-gray-700 mb-2">追加レイヤー</div>
          <div className="flex flex-col gap-1">
            {Object.entries(CHECKBOX_LAYERS).map(([key, layer]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded p-1">
                <input
                  type="checkbox"
                  checked={checkboxLayers.has(key as CheckboxLayerType)}
                  onChange={() => toggleCheckboxLayer(key as CheckboxLayerType)}
                  className="w-4 h-4 text-blue-500 rounded flex-shrink-0"
                />
                <span className="text-sm text-gray-700 flex-1 min-w-0">{layer.name}</span>
                {'scale' in layer && layer.scale && (
                  <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0 ml-1">{layer.scale}</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* 地形表示オプション */}
        <div className="bg-white rounded-lg shadow-md p-3">
          <div className="text-xs font-semibold text-gray-700 mb-2">地形表現</div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showTerrain}
              onChange={(e) => setShowTerrain(e.target.checked)}
              className="w-4 h-4 text-blue-500 rounded"
            />
            <span className="text-sm text-gray-700">標高表現</span>
          </label>
        </div>

        {/* デバッグ表示 */}
        <div className="bg-white rounded-lg shadow-md p-3">
          <div className="text-xs font-semibold text-gray-700 mb-2">デバッグ</div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showTileBoundaries}
              onChange={(e) => setShowTileBoundaries(e.target.checked)}
              className="w-4 h-4 text-blue-500 rounded"
            />
            <span className="text-sm text-gray-700">タイル境界表示</span>
          </label>
          {showTileBoundaries && (
            <div className="text-xs text-gray-500 mt-1">
              各タイルのzoom levelが表示されます
            </div>
          )}
        </div>
      </div>

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
        mapStyle={MAP_STYLES['standard'].url}
        attributionControl={true}
        onZoom={handleZoomChange}
        onMove={handleZoomChange}
        onClick={(e) => {
          const map = mapRef.current?.getMap();
          if (map) {
            const features = map.queryRenderedFeatures(e.point);
            console.log('=== Clicked features ===');
            console.log('Lat/Lon:', e.lngLat);
            console.log('Features:', features.map((f: any) => ({
              layer: f.layer.id,
              sourceLayer: f.sourceLayer,
              properties: f.properties
            })));
          }
        }}
      >
        {/* ズームレベル表示 */}
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            right: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '8px 12px',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            fontFamily: 'monospace',
            fontSize: '14px',
            fontWeight: 'bold',
            zIndex: 1,
          }}
        >
          Zoom: {currentZoom.toFixed(2)}
        </div>
        {/* ナビゲーションコントロール */}
        <NavigationControl position="top-right" />

        {/* スケールコントロール */}
        <ScaleControl position="bottom-left" unit="metric" />

        {/* 都道府県レイヤー */}
        {geojsonData && (
          <Source id="prefecture-data" type="geojson" data={geojsonData}>
            <Layer {...prefectureBorderStyle} />
            <Layer {...prefectureLabelStyle} />
          </Source>
        )}
      </Map>
    </div>
  );
}
