// マップレイヤーの共通定義

export const OVERLAY_LAYERS = {
  none: { name: 'なし' },
  landcover1: { name: 'OpenStreetMap', url: '/landcover-style.json', scale: '～30km', tooltip: '土地被覆情報' },
  landcover2: { name: '国土数値情報', url: '/landcover2-style.json', scale: '～30km', tooltip: '土地被覆情報' },
  landcover3: { name: 'ESA WorldCover', url: '/landcover3-style.json', scale: '～30km', tooltip: '土地被覆情報' },
  landuse1: { name: '国土数値情報（詳細）', url: '/landuse1-style.json', scale: '～100km', tooltip: '土地利用情報' },
  landuse2: { name: '国土数値情報（簡易）', url: '/landuse2-style.json', scale: '～100km', tooltip: '土地利用情報' },
  landuse3: { name: '都市計画基礎調査', url: '/landuse3-style.json', scale: '～1km', tooltip: '土地利用情報' },
} as const;

export const CHECKBOX_LAYERS = {
  urban: { name: '都市域（簡易）', url: '/urban-overlay.json', scale: '～100km', tooltip: '国土数値情報（簡易）の広域用データのズームイン展開' },
  prefectureCapitals: { name: '都道府県庁舎', scale: '全域', tooltip: '47都道府県の県庁所在地' },
  terrain: { name: '標高表現', scale: '全域', tooltip: '標高データに基づく陰影起伏表現' },
  tileBoundaries: { name: 'タイル境界表示（Zoom/X/Y）', scale: '全域', tooltip: 'データ境界' },
} as const;

export const POPULATION_CHECKBOX_LAYERS = {
  populationPrefecture: { name: '都道府県・円', tooltip: '都道府県別人口を円の大きさで表現' },
  populationPrefecture3d: { name: '都道府県・3D', tooltip: '都道府県別人口を3D円柱で表現' },
  populationCity: { name: '市区町村・円', tooltip: '主要都市の人口を円の大きさで表現' },
  populationCity3d: { name: '市区町村・3D', tooltip: '主要都市の人口を3D円柱で表現' },
} as const;

export type OverlayType = keyof typeof OVERLAY_LAYERS;
export type CheckboxLayerType = keyof typeof CHECKBOX_LAYERS;
export type PopulationLayerType = keyof typeof POPULATION_CHECKBOX_LAYERS;
export type AllCheckboxLayerType = CheckboxLayerType | PopulationLayerType;
