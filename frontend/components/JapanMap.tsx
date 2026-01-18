'use client';

import { useEffect, useRef, useState } from 'react';
import Map, { Source, Layer, NavigationControl, ScaleControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { LayerProps } from 'react-map-gl/maplibre';
import { OVERLAY_LAYERS, CHECKBOX_LAYERS, POPULATION_CHECKBOX_LAYERS, type OverlayType, type AllCheckboxLayerType } from '@/lib/mapLayers';

interface JapanMapProps {
  geojsonUrl?: string;
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
  overlayLayer: string;
  checkboxLayers: Set<string>;
  showTerrain: boolean;
  showTileBoundaries: boolean;
}

// マップスタイル定義
const MAP_STYLES = {
  standard: {
    name: '標準地図',
    url: 'https://tile.openstreetmap.jp/styles/osm-bright-ja/style.json',
  },
} as const;

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

export default function JapanMap({
  geojsonUrl,
  initialViewState,
  overlayLayer,
  checkboxLayers,
  showTerrain,
  showTileBoundaries
}: JapanMapProps) {
  const mapRef = useRef<any>(null);
  const [geojsonData, setGeojsonData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentZoom, setCurrentZoom] = useState<number>(initialViewState?.zoom || 5);
  const [centerCoords, setCenterCoords] = useState<{ lng: number; lat: number }>({
    lng: initialViewState?.longitude || 138.0,
    lat: initialViewState?.latitude || 37.0,
  });
  const [populationPrefectureData, setPopulationPrefectureData] = useState<any[]>([]);

  // デフォルトの視点設定（日本全体）
  const defaultViewState = {
    longitude: 138.0,
    latitude: 37.0,
    zoom: 5,
  };

  // ズームレベルと中心座標の更新
  const handleMapMove = () => {
    const map = mapRef.current?.getMap();
    if (map) {
      setCurrentZoom(map.getZoom());
      const center = map.getCenter();
      setCenterCoords({ lng: center.lng, lat: center.lat });
    }
  };

  // タイル境界表示の切り替え
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (map) {
      map.showTileBoundaries = showTileBoundaries;
    }
  }, [showTileBoundaries]);

  // 人口データの読み込み（県庁所在地レイヤー用）
  useEffect(() => {
    const loadPopulationData = async () => {
      try {
        const prefResponse = await fetch('/population-prefecture-circle.json');
        if (prefResponse.ok) {
          const prefData = await prefResponse.json();
          const formattedPrefData = prefData.features.map((f: any) => ({
            name: f.properties.name,
            population: f.properties.population,
            coordinates: f.geometry.coordinates as [number, number]
          }));
          setPopulationPrefectureData(formattedPrefData);
        }
      } catch (error) {
        console.error('❌ 人口データ読み込みエラー:', error);
      }
    };

    loadPopulationData();
  }, []);

  // マップ初期化時に事前準備（地形データと都市域データ）
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const prepareData = async () => {
      console.log('🔧 データ事前準備開始');

      // 1. 地形データソースを事前追加
      if (!map.getSource('terrarium')) {
        map.addSource('terrarium', {
          type: 'raster-dem',
          tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
          encoding: 'terrarium',
          tileSize: 256,
        });
        console.log('  ✓ 地形ソース事前追加');
      }

      // 2. 都市域データソースを事前追加（ベクタータイル）
      const vectorSourceId = 'checkbox-urban-vector';
      if (!map.getSource(vectorSourceId)) {
        map.addSource(vectorSourceId, {
          type: 'vector',
          tiles: ['https://tile.openstreetmap.jp/data/planet/{z}/{x}/{y}.pbf'],
          minzoom: 0,
          maxzoom: 14
        });
        console.log('  ✓ 都市域ベクタータイルソース事前追加');
      }

      // 3. 都市域GeoJSONデータを事前読み込み
      const geojsonSourceId = 'checkbox-urban-geojson';
      if (!map.getSource(geojsonSourceId)) {
        try {
          const response = await fetch('/urban-areas-coarse.json');
          if (response.ok) {
            const geojsonData = await response.json();
            map.addSource(geojsonSourceId, {
              type: 'geojson',
              data: geojsonData
            });
            console.log('  ✓ 都市域GeoJSONソース事前追加');
          }
        } catch (error) {
          console.warn('  ⚠️ 都市域GeoJSON事前読み込み失敗:', error);
        }
      }

      console.log('🎉 データ事前準備完了');
    };

    // マップが完全に読み込まれたら実行
    if (map.isStyleLoaded()) {
      prepareData();
    } else {
      map.once('load', prepareData);
    }
  }, []);

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

  // 標高レイヤーの管理（地形陰影起伏）
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) {
      console.log('❌ Terrain: Map not ready');
      return;
    }

    const startTime = Date.now();
    console.log(`🔄 [${startTime}] 標高表現: ${showTerrain ? 'ON' : 'OFF'}`);

    if (showTerrain) {
      // ソースが未準備の場合は追加（事前準備が完了していない場合の対策）
      if (!map.getSource('terrarium')) {
        console.log(`  ⚠️ 地形ソース未準備、追加中`);
        map.addSource('terrarium', {
          type: 'raster-dem',
          tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
          encoding: 'terrarium',
          tileSize: 256,
        });
      }

      // レイヤーを追加
      if (!map.getLayer('hillshade')) {
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
        console.log(`  ✓ 陰影起伏レイヤー追加`);
      }
      console.log(`🎉 [${startTime}] 標高表現ON完了 (${Date.now() - startTime}ms)`);
    } else {
      // 陰影起伏レイヤーを削除（ソースは残す - 次回の表示が速くなる）
      if (map.getLayer('hillshade')) {
        map.removeLayer('hillshade');
        console.log(`  🗑️ 陰影起伏レイヤー削除`);
      }
      console.log(`🎉 [${startTime}] 標高表現OFF完了 (${Date.now() - startTime}ms)`);
    }
  }, [showTerrain]);

  // オーバーレイレイヤーの管理
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) {
      console.log('❌ Map not ready: mapRef is null');
      return;
    }

    const startTime = Date.now();
    const currentLayer = overlayLayer; // 現在のレイヤーを固定
    const abortController = new AbortController();

    console.log(`🔄 [${startTime}] レイヤー切り替え開始: "${currentLayer}"`);

    // MapLibreは内部的にスタイルのロード状態を管理するため、
    // isStyleLoaded()チェックを削除し、直接処理を実行
    processOverlayChange(map, currentLayer, startTime, abortController);

    // クリーンアップ: 次のレイヤー切り替え時にすべてをキャンセル
    return () => {
      if (!abortController.signal.aborted) {
        console.log(`🛑 [${startTime}] クリーンアップ実行: "${currentLayer}" を中断`);
        abortController.abort();
      }
    };
  }, [overlayLayer]);

  // オーバーレイレイヤーの変更処理を関数として分離
  const processOverlayChange = (map: any, targetLayer: string, startTime: number, abortController: AbortController) => {
    // 既に中断されていればスキップ
    if (abortController.signal.aborted) {
      console.log(`⚠️ [${startTime}] 既に中断済み: "${targetLayer}" - 処理をスキップ`);
      return;
    }

    // 既存のオーバーレイレイヤーとソースをすべて削除
    const style = map.getStyle();
    const overlayLayerIds = style.layers
      ?.filter((layer: any) => layer.id.startsWith('landcover-') || layer.id.startsWith('landuse-'))
      .map((layer: any) => layer.id) || [];

    if (overlayLayerIds.length > 0) {
      console.log(`🗑️ [${startTime}] 削除するレイヤー:`, overlayLayerIds);
    }

    overlayLayerIds.forEach((id: string) => {
      if (map.getLayer(id)) {
        map.removeLayer(id);
        console.log(`  ✓ レイヤー削除: ${id}`);
      }
    });

    // オーバーレイソースを削除
    ['landcover-tiles', 'landuse-data'].forEach(sourceId => {
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
        console.log(`  ✓ ソース削除: ${sourceId}`);
      }
    });

    // 新しいオーバーレイレイヤーを追加（"none"以外の場合）
    if (targetLayer !== 'none' && OVERLAY_LAYERS[targetLayer]?.url) {
      const layerUrl = OVERLAY_LAYERS[targetLayer].url!;
      console.log(`📥 [${startTime}] fetch開始: ${layerUrl}`);

      // オーバーレイスタイルを読み込んで適用
      fetch(layerUrl, { signal: abortController.signal })
        .then(res => {
          const fetchTime = Date.now() - startTime;
          console.log(`📦 [${startTime}] fetch完了 (${fetchTime}ms): "${targetLayer}"`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(overlayStyle => {
          // fetchが完了する前に別のレイヤーに切り替わっていたらスキップ
          if (abortController.signal.aborted) {
            console.log(`⚠️ [${startTime}] 中断検出（aborted）: "${targetLayer}" - レイヤー追加をスキップ`);
            return;
          }

          const parseTime = Date.now() - startTime;
          console.log(`✅ [${startTime}] レイヤー追加開始 (${parseTime}ms): "${targetLayer}"`, {
            sources: Object.keys(overlayStyle.sources || {}),
            layers: overlayStyle.layers?.length || 0
          });

          // オーバーレイスタイルのソースを追加
          if (overlayStyle.sources) {
            Object.entries(overlayStyle.sources).forEach(([sourceId, sourceConfig]: [string, any]) => {
              if (!map.getSource(sourceId)) {
                map.addSource(sourceId, sourceConfig);
                console.log(`  ✓ ソース追加: ${sourceId}`);
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
                map.addLayer(layerWithOpacity);
                console.log(`  ✓ レイヤー追加: ${layer.id} (type: ${layer.type})`);
              }
            });
          }

          const totalTime = Date.now() - startTime;
          console.log(`🎉 [${startTime}] レイヤー切り替え完了 (${totalTime}ms): "${targetLayer}"`);
        })
        .catch(err => {
          const errorTime = Date.now() - startTime;
          // AbortErrorは無視（正常なキャンセル）
          if (err.name === 'AbortError') {
            console.log(`🚫 [${startTime}] fetch中断 (${errorTime}ms): "${targetLayer}" - これは正常です`);
            return;
          }
          console.error(`❌ [${startTime}] エラー発生 (${errorTime}ms):`, err);
          setError(`オーバーレイの読み込みに失敗しました: ${err.message}`);
        });
    } else if (targetLayer === 'none') {
      console.log(`✅ [${startTime}] レイヤー「なし」に設定完了`);
    }
  };

  // チェックボックスレイヤーの管理（都市域など）
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) {
      console.log('❌ Checkbox layers: Map not ready');
      return;
    }

    const startTime = Date.now();
    const currentLayers = new Set(checkboxLayers); // 現在の状態を固定
    const abortController = new AbortController();

    console.log(`🔄 [${startTime}] チェックボックスレイヤー管理開始:`, Array.from(currentLayers));

    // すべてのチェックボックスレイヤーを確認
    const processLayers = async () => {
      // urbanレイヤーのみ処理（population*はPOPULATION_CHECKBOX_LAYERSで管理）
      const layerKey = 'urban';
      const layer = CHECKBOX_LAYERS[layerKey];
      const isEnabled = currentLayers.has(layerKey);
      const vectorSourceId = `checkbox-${layerKey}-vector`;
      const vectorFillLayerId = `${vectorSourceId}-fill`;
      const vectorOutlineLayerId = `${vectorSourceId}-outline`;
      const geojsonSourceId = `checkbox-${layerKey}-geojson`;
      const geojsonFillLayerId = `${geojsonSourceId}-fill`;
      const geojsonOutlineLayerId = `${geojsonSourceId}-outline`;

      console.log(`  処理中: ${layerKey}, 有効: ${isEnabled}`);

      if (isEnabled) {
        // ソースは既に事前準備済みなので、レイヤーだけ追加（軽量な処理）
        // ソースが未準備の場合のみ追加
        if (!map.getSource(vectorSourceId)) {
            console.log(`  ⚠️ ソース未準備、追加中: ${vectorSourceId}`);
            map.addSource(vectorSourceId, {
              type: 'vector',
              tiles: ['https://tile.openstreetmap.jp/data/planet/{z}/{x}/{y}.pbf'],
              minzoom: 0,
              maxzoom: 14
            });
          }

          if (!map.getSource(geojsonSourceId)) {
            console.log(`  ⚠️ ソース未準備、追加中: ${geojsonSourceId}`);
            try {
              const response = await fetch('/urban-areas-coarse.json', { signal: abortController.signal });
              if (!response.ok) throw new Error(`HTTP ${response.status}`);

              // 中断チェック
              if (abortController.signal.aborted) {
                console.log(`  🚫 fetch中断: ${geojsonSourceId}`);
                return;
              }

              const geojsonData = await response.json();

              // 中断チェック（parse後）
              if (abortController.signal.aborted) {
                console.log(`  🚫 parse後に中断: ${geojsonSourceId}`);
                return;
              }

              map.addSource(geojsonSourceId, {
                type: 'geojson',
                data: geojsonData
              });
              console.log(`  ✓ GeoJSONソース追加完了`);
            } catch (error) {
              if ((error as Error).name === 'AbortError') {
                console.log(`  🚫 fetch中断 (AbortError): ${geojsonSourceId}`);
                return;
              }
              console.error(`  ❌ GeoJSON読み込み失敗 ${layerKey}:`, error);
            }
          }

          // レイヤーを追加（ソースは準備済みなので高速）
          const layers = map.getStyle().layers;
          const firstSymbolId = layers?.find((layer: any) => layer.type === 'symbol')?.id;

          // zoom 0-5用：ベクタータイルレイヤー（粗い大きなポリゴン）
          if (!map.getLayer(vectorFillLayerId)) {
            console.log(`  ✓ ベクタータイルレイヤー追加: ${vectorFillLayerId}`);
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

        console.log(`  ✓ レイヤー追加完了: ${layerKey} (${Date.now() - startTime}ms)`);
      } else {
        // レイヤーを削除（ソースは残す - 次回の表示が速くなる）
        [vectorOutlineLayerId, vectorFillLayerId, geojsonOutlineLayerId, geojsonFillLayerId].forEach(layerId => {
          if (map.getLayer(layerId)) {
            console.log(`  🗑️ レイヤー削除: ${layerId}`);
            map.removeLayer(layerId);
          }
        });
        // ソースは削除しない（キャッシュとして残す）
      }

      const totalTime = Date.now() - startTime;
      console.log(`🎉 [${startTime}] チェックボックスレイヤー管理完了 (${totalTime}ms)`);
    };

    processLayers().catch(err => {
      console.error('チェックボックスレイヤー処理エラー:', err);
    });

    // クリーンアップ
    return () => {
      if (!abortController.signal.aborted) {
        console.log(`🛑 [${startTime}] チェックボックスレイヤー処理を中断`);
        abortController.abort();
      }
    };
  }, [checkboxLayers]);

  // 人口レイヤーの管理（円表示と3D表示）
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) {
      console.log('❌ Population layers: Map not ready');
      return;
    }

    const startTime = Date.now();
    const currentLayers = new Set(checkboxLayers);
    const abortController = new AbortController();

    console.log(`🔄 [${startTime}] 人口レイヤー管理開始:`, Array.from(currentLayers));

    const processPopulationLayers = async () => {
      const populationLayers = [
        {
          key: 'populationPrefecture',
          dataUrl: '/population-prefecture-circle.json',
          sourceId: 'population-prefecture-source',
          layerId: 'population-prefecture-layer',
          type: 'circle' as const,
          color: '#FF6B6B',
          strokeColor: '#C92A2A'
        },
        {
          key: 'populationPrefecture3d',
          dataUrl: '/population-prefecture-3d.json',
          sourceId: 'population-prefecture-3d-source',
          layerId: 'population-prefecture-3d-layer',
          type: 'fill-extrusion' as const,
          color: '#FF6B6B'
        },
        {
          key: 'populationCity',
          dataUrl: '/population-city-circle.json',
          sourceId: 'population-city-source',
          layerId: 'population-city-layer',
          type: 'circle' as const,
          color: '#4ECDC4',
          strokeColor: '#2D9B95'
        },
        {
          key: 'populationCity3d',
          dataUrl: '/population-city-3d.json',
          sourceId: 'population-city-3d-source',
          layerId: 'population-city-3d-layer',
          type: 'fill-extrusion' as const,
          color: '#4ECDC4'
        }
      ];

      for (const layer of populationLayers) {
        // 中断チェック
        if (abortController.signal.aborted) {
          console.log(`🚫 [${startTime}] 中断検出 - 人口レイヤー処理を中止`);
          return;
        }

        const isEnabled = currentLayers.has(layer.key as AllCheckboxLayerType);
        console.log(`  処理中: ${layer.key}, 有効: ${isEnabled}`);

        if (isEnabled) {
          // データソースを追加（初回のみ）
          if (!map.getSource(layer.sourceId)) {
            console.log(`  📥 データ読み込み開始: ${layer.dataUrl}`);
            try {
              const response = await fetch(layer.dataUrl, { signal: abortController.signal });
              if (!response.ok) throw new Error(`HTTP ${response.status}`);

              if (abortController.signal.aborted) {
                console.log(`  🚫 fetch中断: ${layer.sourceId}`);
                return;
              }

              const geojsonData = await response.json();

              if (abortController.signal.aborted) {
                console.log(`  🚫 parse後に中断: ${layer.sourceId}`);
                return;
              }

              map.addSource(layer.sourceId, {
                type: 'geojson',
                data: geojsonData
              });
              console.log(`  ✓ データソース追加: ${layer.sourceId}`);
            } catch (error) {
              if ((error as Error).name === 'AbortError') {
                console.log(`  🚫 fetch中断 (AbortError): ${layer.sourceId}`);
                return;
              }
              console.error(`  ❌ データ読み込み失敗 ${layer.key}:`, error);
              continue;
            }
          }

          // レイヤーを追加
          if (!map.getLayer(layer.layerId)) {
            const layers = map.getStyle().layers;
            const firstSymbolId = layers?.find((l: any) => l.type === 'symbol')?.id;

            if (layer.type === 'circle') {
              // 円レイヤー（人口に比例した大きさ）
              map.addLayer({
                id: layer.layerId,
                type: 'circle',
                source: layer.sourceId,
                paint: {
                  'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['get', 'population'],
                    0, 3,              // 人口0 → 半径3px
                    100000, 8,         // 10万人 → 半径8px
                    500000, 15,        // 50万人 → 半径15px
                    1000000, 22,       // 100万人 → 半径22px
                    5000000, 35,       // 500万人 → 半径35px
                    10000000, 50       // 1000万人 → 半径50px
                  ],
                  'circle-color': layer.color,
                  'circle-opacity': 0.6,
                  'circle-stroke-width': 2,
                  'circle-stroke-color': layer.strokeColor,
                  'circle-stroke-opacity': 0.8
                }
              }, firstSymbolId);
              console.log(`  ✓ 円レイヤー追加: ${layer.layerId}`);
            } else if (layer.type === 'fill-extrusion') {
              // 3Dレイヤー（円柱状）
              // 注: MapLibre GL JSでは rounded-roof 未対応のため円柱表示
              map.addLayer({
                id: layer.layerId,
                type: 'fill-extrusion',
                source: layer.sourceId,
                paint: {
                  'fill-extrusion-color': layer.color,
                  'fill-extrusion-height': [
                    'interpolate',
                    ['linear'],
                    ['get', 'population'],
                    0, 0,
                    100000, 5000,      // 10万人 → 5km
                    500000, 15000,     // 50万人 → 15km
                    1000000, 30000,    // 100万人 → 30km
                    5000000, 80000,    // 500万人 → 80km
                    10000000, 120000   // 1000万人 → 120km
                  ],
                  'fill-extrusion-base': 0,
                  'fill-extrusion-opacity': 0.7
                }
              }, firstSymbolId);
              console.log(`  ✓ 3D円柱レイヤー追加: ${layer.layerId}`);
            }
          }

          console.log(`  ✓ レイヤー追加完了: ${layer.key} (${Date.now() - startTime}ms)`);
        } else {
          // レイヤーを削除（ソースは残す）
          if (map.getLayer(layer.layerId)) {
            map.removeLayer(layer.layerId);
            console.log(`  🗑️ レイヤー削除: ${layer.layerId}`);
          }
          // ソースは削除しない（キャッシュとして残す）
        }
      }

      const totalTime = Date.now() - startTime;
      console.log(`🎉 [${startTime}] 人口レイヤー管理完了 (${totalTime}ms)`);
    };

    processPopulationLayers().catch(err => {
      console.error('人口レイヤー処理エラー:', err);
    });

    // クリーンアップ
    return () => {
      if (!abortController.signal.aborted) {
        console.log(`🛑 [${startTime}] 人口レイヤー処理を中断`);
        abortController.abort();
      }
    };
  }, [checkboxLayers]);

  // 県庁所在地レイヤーの管理
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const prefectureCapitalsEnabled = checkboxLayers.has('prefectureCapitals');
    const sourceId = 'prefecture-capitals';
    const layerId = 'prefecture-capitals-layer';

    if (prefectureCapitalsEnabled && populationPrefectureData.length > 0) {
      // GeoJSONデータを作成
      const geojsonData = {
        type: 'FeatureCollection',
        features: populationPrefectureData.map((pref: any) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: pref.coordinates
          },
          properties: {
            name: pref.name
          }
        }))
      };

      // ソースを追加または更新
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojsonData as any
        });
      } else {
        (map.getSource(sourceId) as any).setData(geojsonData);
      }

      // レイヤーを追加
      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': 5,
            'circle-color': '#FF6B6B',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#FFFFFF'
          }
        });

        // ラベルレイヤー
        map.addLayer({
          id: `${layerId}-label`,
          type: 'symbol',
          source: sourceId,
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 11,
            'text-offset': [0, 1.2],
            'text-anchor': 'top'
          },
          paint: {
            'text-color': '#333333',
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 1.5
          }
        });

        console.log('✓ 県庁所在地レイヤー追加');
      }
    } else {
      // レイヤーを削除
      if (map.getLayer(`${layerId}-label`)) {
        map.removeLayer(`${layerId}-label`);
      }
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    }
  }, [checkboxLayers, populationPrefectureData]);

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
        mapStyle={MAP_STYLES['standard'].url}
        attributionControl={false}
        onLoad={(e) => {
          const map = e.target;
          console.log(`🗺️ [マップonLoad] マップロード完了`);
          console.log(`🔍 [マップonLoad] Deck.GL初期化チェック - deckOverlayRef.current: ${!!deckOverlayRef.current}`);

          if (!deckOverlayRef.current) {
            console.log(`🚀 [マップonLoad] Deck.GL初期化開始...`);
            const deckOverlay = new MapboxOverlay({
              interleaved: true,
              layers: []
            });
            deckOverlayRef.current = deckOverlay;
            map.addControl(deckOverlay as any);
            console.log('✅ [マップonLoad] Deck.GLオーバーレイ初期化完了');
          }
        }}
        onZoom={handleMapMove}
        onMove={handleMapMove}
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
        {/* 経緯度表示（右上、ナビゲーションの左） */}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '50px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '6px 10px',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            fontFamily: 'monospace',
            fontSize: '12px',
            fontWeight: 'bold',
            zIndex: 1,
          }}
        >
          {centerCoords.lat.toFixed(5)}°N, {centerCoords.lng.toFixed(5)}°E
        </div>

        {/* ズームレベル表示（経緯度の下、ナビゲーションの左） */}
        <div
          style={{
            position: 'absolute',
            top: '42px',
            right: '50px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '6px 10px',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            fontFamily: 'monospace',
            fontSize: '12px',
            fontWeight: 'bold',
            zIndex: 1,
          }}
        >
          Zoom: {currentZoom.toFixed(2)}
        </div>

        {/* ナビゲーションコントロール（右上） */}
        <NavigationControl position="top-right" />

        {/* スケールコントロール（右下） */}
        <ScaleControl position="bottom-right" unit="metric" />

        {/* マップ情報（中央下） */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            padding: '4px 8px',
            borderRadius: '3px',
            fontSize: '11px',
            color: '#333',
            zIndex: 1,
          }}
        >
          © OpenStreetMap contributors
        </div>

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
