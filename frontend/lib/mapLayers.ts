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
  terrain: { name: '標高表現', scale: '', tooltip: '標高データに基づく陰影起伏表現' },
  tileBoundaries: { name: 'タイル境界表示（Zoom/X/Y）', scale: '', tooltip: 'データ境界' },
} as const;

export type OverlayType = keyof typeof OVERLAY_LAYERS;
export type CheckboxLayerType = keyof typeof CHECKBOX_LAYERS;
