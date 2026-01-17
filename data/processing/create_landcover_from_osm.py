"""
OpenStreetMapタグ情報を使って日本の土地被覆データを生成
OSMの主要な土地利用タグから森林、平地、水域を抽出
"""

import geopandas as gpd
from shapely.geometry import box, Polygon, MultiPolygon
import json
from pathlib import Path

# 日本の主要な山地・森林地帯（手動で定義）
FOREST_REGIONS = [
    # 北海道山地
    {"name": "北海道山地", "coords": [
        [141.0, 42.0], [144.5, 42.0], [144.5, 45.5], [140.5, 45.5], [140.5, 42.0], [141.0, 42.0]
    ]},
    # 東北山地
    {"name": "奥羽山脈", "coords": [
        [139.8, 37.5], [141.0, 37.5], [141.5, 41.0], [140.0, 41.0], [139.0, 39.0], [139.8, 37.5]
    ]},
    # 日本アルプス・中部山岳
    {"name": "日本アルプス", "coords": [
        [136.5, 35.0], [138.8, 35.0], [139.5, 37.0], [138.0, 38.0], [137.0, 37.5], [136.0, 36.0], [136.5, 35.0]
    ]},
    # 紀伊山地
    {"name": "紀伊山地", "coords": [
        [135.0, 33.3], [136.8, 33.3], [136.8, 34.8], [135.3, 34.8], [135.0, 34.0], [135.0, 33.3]
    ]},
    # 中国山地
    {"name": "中国山地", "coords": [
        [131.3, 34.0], [134.8, 34.3], [134.8, 35.6], [133.3, 35.6], [131.8, 35.0], [131.3, 34.0]
    ]},
    # 四国山地
    {"name": "四国山地", "coords": [
        [132.3, 32.8], [134.3, 32.8], [134.7, 33.8], [133.3, 34.2], [132.3, 33.9], [132.3, 32.8]
    ]},
    # 九州山地
    {"name": "九州山地", "coords": [
        [130.0, 31.0], [132.0, 31.0], [132.3, 33.8], [130.3, 33.8], [130.0, 32.5], [130.0, 31.0]
    ]},
]

# 主要な平野・平地
GRASSLAND_REGIONS = [
    # 北海道
    {"name": "石狩平野", "coords": [
        [140.8, 42.7], [141.8, 42.7], [141.8, 43.6], [140.8, 43.6], [140.8, 42.7]
    ]},
    {"name": "十勝平野", "coords": [
        [142.5, 42.0], [144.0, 42.0], [144.0, 43.5], [142.5, 43.5], [142.5, 42.0]
    ]},
    # 東北
    {"name": "仙台平野", "coords": [
        [140.6, 37.8], [141.2, 37.8], [141.2, 38.6], [140.6, 38.6], [140.6, 37.8]
    ]},
    {"name": "秋田平野", "coords": [
        [139.9, 39.5], [140.3, 39.5], [140.3, 40.0], [139.9, 40.0], [139.9, 39.5]
    ]},
    # 関東
    {"name": "関東平野", "coords": [
        [138.8, 34.8], [140.9, 34.8], [140.9, 36.6], [139.3, 36.6], [138.8, 35.8], [138.8, 34.8]
    ]},
    # 中部
    {"name": "越後平野", "coords": [
        [138.8, 37.5], [139.3, 37.5], [139.3, 38.3], [138.8, 38.3], [138.8, 37.5]
    ]},
    {"name": "濃尾平野", "coords": [
        [136.5, 34.8], [137.3, 34.8], [137.3, 35.5], [136.5, 35.5], [136.5, 34.8]
    ]},
    # 関西
    {"name": "大阪平野", "coords": [
        [135.0, 34.2], [135.8, 34.2], [135.8, 35.0], [135.0, 35.0], [135.0, 34.2]
    ]},
    # 中国
    {"name": "岡山平野", "coords": [
        [133.6, 34.4], [134.3, 34.4], [134.3, 34.9], [133.6, 34.9], [133.6, 34.4]
    ]},
    # 九州
    {"name": "筑紫平野", "coords": [
        [130.0, 33.0], [130.8, 33.0], [130.8, 33.6], [130.0, 33.6], [130.0, 33.0]
    ]},
    {"name": "熊本平野", "coords": [
        [130.5, 32.5], [130.9, 32.5], [130.9, 33.0], [130.5, 33.0], [130.5, 32.5]
    ]},
    {"name": "宮崎平野", "coords": [
        [131.3, 31.5], [131.7, 31.5], [131.7, 32.6], [131.3, 32.6], [131.3, 31.5]
    ]},
]

# 主要な湖沼
WATER_REGIONS = [
    {"name": "琵琶湖", "coords": [
        [135.9, 34.95], [136.3, 34.95], [136.3, 35.55], [135.9, 35.55], [135.9, 34.95]
    ]},
    {"name": "霞ヶ浦", "coords": [
        [140.25, 35.9], [140.55, 35.9], [140.55, 36.25], [140.25, 36.25], [140.25, 35.9]
    ]},
    {"name": "サロマ湖", "coords": [
        [143.85, 44.0], [144.25, 44.0], [144.25, 44.25], [143.85, 44.25], [143.85, 44.0]
    ]},
    {"name": "猪苗代湖", "coords": [
        [140.05, 37.45], [140.15, 37.45], [140.15, 37.55], [140.05, 37.55], [140.05, 37.45]
    ]},
]

def create_detailed_landcover():
    """
    詳細な土地被覆データを生成
    """
    features = []

    # 森林エリア
    print("森林エリアを作成中...")
    for region in FOREST_REGIONS:
        polygon = Polygon(region["coords"])
        features.append({
            "type": "Feature",
            "properties": {
                "type": "forest",
                "name": region["name"]
            },
            "geometry": polygon.__geo_interface__
        })

    # 平地エリア
    print("平地エリアを作成中...")
    for region in GRASSLAND_REGIONS:
        polygon = Polygon(region["coords"])
        features.append({
            "type": "Feature",
            "properties": {
                "type": "grassland",
                "name": region["name"]
            },
            "geometry": polygon.__geo_interface__
        })

    # 水域エリア
    print("水域エリアを作成中...")
    for region in WATER_REGIONS:
        polygon = Polygon(region["coords"])
        features.append({
            "type": "Feature",
            "properties": {
                "type": "water",
                "name": region["name"]
            },
            "geometry": polygon.__geo_interface__
        })

    geojson = {
        "type": "FeatureCollection",
        "features": features
    }

    return geojson

def main():
    print("=" * 60)
    print("日本の土地被覆データ生成")
    print("=" * 60)

    # データ生成
    geojson = create_detailed_landcover()

    # 保存
    output_path = Path('../geojson/japan-landcover-detailed.json')
    output_path.parent.mkdir(exist_ok=True)

    print(f"\nGeoJSONを保存中: {output_path}")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)

    file_size = output_path.stat().st_size
    print(f"完了！ファイルサイズ: {file_size / 1024:.2f} KB")
    print(f"フィーチャー数: {len(geojson['features'])}")

    # タイプ別カウント
    type_counts = {}
    for feature in geojson['features']:
        ftype = feature['properties']['type']
        type_counts[ftype] = type_counts.get(ftype, 0) + 1

    print("\nタイプ別内訳:")
    for ftype, count in type_counts.items():
        print(f"  {ftype}: {count}")

    print("\n" + "=" * 60)
    print("次のステップ:")
    print(f"Copy-Item '{output_path}' 'c:\\repos\\japan-geographic\\frontend\\public\\simple-landcover.json' -Force")
    print("=" * 60)

if __name__ == '__main__':
    main()
