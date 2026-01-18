"""
人口データのGeoJSON生成スクリプト

都道府県・市区町村の人口データを取得し、
円表示用（Point）と3D表示用（Polygon）の両方に対応したGeoJSONを生成

3万人以上の全市区町村を網羅的に含む
"""

import json
import requests
from pathlib import Path

# 3万人以上の市区町村データをインポート
from fetch_city_population import CITY_POPULATION_30K_PLUS

# 2024年10月1日時点の都道府県人口データ（総務省統計局）
# center座標は各都道府県庁の正確な位置（世界測地系）
PREFECTURE_POPULATION = {
    "北海道": {"population": 5140000, "center": [141.34694, 43.06417]},  # 北海道道庁
    "青森県": {"population": 1186000, "center": [140.74000, 40.82444]},  # 青森県庁
    "岩手県": {"population": 1180000, "center": [141.15270, 39.70361]},  # 岩手県庁
    "宮城県": {"population": 2270000, "center": [140.87194, 38.26889]},  # 宮城県庁
    "秋田県": {"population": 933000, "center": [140.10278, 39.71861]},  # 秋田県庁
    "山形県": {"population": 1029000, "center": [140.36333, 38.24056]},  # 山形県庁
    "福島県": {"population": 1794000, "center": [140.46778, 37.75028]},  # 福島県庁
    "茨城県": {"population": 2843000, "center": [140.44667, 36.34167]},  # 茨城県庁
    "栃木県": {"population": 1914000, "center": [139.88361, 36.56583]},  # 栃木県庁
    "群馬県": {"population": 1919000, "center": [139.06083, 36.39111]},  # 群馬県庁
    "埼玉県": {"population": 7345000, "center": [139.64889, 35.85694]},  # 埼玉県庁
    "千葉県": {"population": 6281000, "center": [140.12333, 35.60472]},  # 千葉県庁
    "東京都": {"population": 14047000, "center": [139.69167, 35.68944]},  # 東京都都庁
    "神奈川県": {"population": 9233000, "center": [139.64250, 35.44778]},  # 神奈川県庁
    "新潟県": {"population": 2155000, "center": [139.02361, 37.90222]},  # 新潟県庁
    "富山県": {"population": 1016000, "center": [137.21139, 36.69528]},  # 富山県庁
    "石川県": {"population": 1119000, "center": [136.62556, 36.59444]},  # 石川県庁
    "福井県": {"population": 754000, "center": [136.22167, 36.06528]},  # 福井県庁
    "山梨県": {"population": 804000, "center": [138.56833, 35.66361]},  # 山梨県庁
    "長野県": {"population": 2019000, "center": [138.18111, 36.65139]},  # 長野県庁
    "岐阜県": {"population": 1950000, "center": [136.72222, 35.39111]},  # 岐阜県庁
    "静岡県": {"population": 3602000, "center": [138.38306, 34.97694]},  # 静岡県庁
    "愛知県": {"population": 7539000, "center": [136.90667, 35.18028]},  # 愛知県庁
    "三重県": {"population": 1747000, "center": [136.50861, 34.73028]},  # 三重県庁
    "滋賀県": {"population": 1414000, "center": [135.86806, 35.00444]},  # 滋賀県庁
    "京都府": {"population": 2544000, "center": [135.75556, 35.02111]},  # 京都府庁
    "大阪府": {"population": 8809000, "center": [135.52000, 34.68639]},  # 大阪府庁
    "兵庫県": {"population": 5408000, "center": [135.18306, 34.69139]},  # 兵庫県庁
    "奈良県": {"population": 1307000, "center": [135.83278, 34.68528]},  # 奈良県庁
    "和歌山県": {"population": 911000, "center": [135.16750, 34.22611]},  # 和歌山県庁
    "鳥取県": {"population": 548000, "center": [134.23778, 35.50361]},  # 鳥取県庁
    "島根県": {"population": 663000, "center": [133.05009, 35.47629]},  # 島根県庁
    "岡山県": {"population": 1863000, "center": [133.93500, 34.66167]},  # 岡山県庁
    "広島県": {"population": 2760000, "center": [132.45944, 34.39639]},  # 広島県庁
    "山口県": {"population": 1312000, "center": [131.47056, 34.18611]},  # 山口県庁
    "徳島県": {"population": 710000, "center": [134.55944, 34.06583]},  # 徳島県庁
    "香川県": {"population": 944000, "center": [134.04333, 34.34000]},  # 香川県庁
    "愛媛県": {"population": 1316000, "center": [132.76556, 33.84167]},  # 愛媛県庁
    "高知県": {"population": 682000, "center": [133.53111, 33.55972]},  # 高知県庁
    "福岡県": {"population": 5135000, "center": [130.41806, 33.60639]},  # 福岡県庁
    "佐賀県": {"population": 807000, "center": [130.29889, 33.24944]},  # 佐賀県庁
    "長崎県": {"population": 1290000, "center": [129.87361, 32.75028]},  # 長崎県庁
    "熊本県": {"population": 1719000, "center": [130.74139, 32.78972]},  # 熊本県庁
    "大分県": {"population": 1116000, "center": [131.61250, 33.23833]},  # 大分県庁
    "宮崎県": {"population": 1054000, "center": [131.42389, 31.91111]},  # 宮崎県庁
    "鹿児島県": {"population": 1570000, "center": [130.55806, 31.56028]},  # 鹿児島県庁
    "沖縄県": {"population": 1467000, "center": [127.68111, 26.21250]},  # 沖縄県庁
}

# 主要市区町村の人口データ（人口3万人以上の市区町村）
# center座標は各市役所・区役所の所在地
# fetch_city_population.pyからインポートされたデータを使用
CITY_POPULATION = CITY_POPULATION_30K_PLUS




def create_circle_geojson(data_dict, data_type):
    """円表示用のPoint GeoJSONを生成"""
    features = []

    for name, info in data_dict.items():
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": info["center"]  # [経度, 緯度]
            },
            "properties": {
                "name": name,
                "population": info["population"],
                "type": data_type,
                "prefecture": info.get("prefecture", name if data_type == "prefecture" else None)
            }
        }
        features.append(feature)

    return {
        "type": "FeatureCollection",
        "features": features
    }


def create_circle_polygon(center, size_factor, segments=32):
    """中心座標から円形ポリゴンを生成（3D表示用ドーム）"""
    import math
    lon, lat = center
    # 人口に応じた半径（度数）
    radius = 0.05 * size_factor  # 基準サイズ

    # 円形の頂点を生成
    points = []
    for i in range(segments):
        angle = 2 * math.pi * i / segments
        x = lon + radius * math.cos(angle)
        y = lat + radius * math.sin(angle)
        points.append([x, y])

    # 最初の点を最後に追加して閉じる
    points.append(points[0])

    return [points]


def create_extrusion_geojson(data_dict, data_type):
    """3D表示用のPolygon GeoJSONを生成"""
    features = []

    for name, info in data_dict.items():
        population = info["population"]
        # 人口に応じたサイズファクター（平方根を使って面積を調整）
        size_factor = (population / 1000000) ** 0.5  # 100万人で1.0

        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": create_circle_polygon(info["center"], size_factor)
            },
            "properties": {
                "name": name,
                "population": population,
                "type": data_type,
                "prefecture": info.get("prefecture", name if data_type == "prefecture" else None),
                # 3D表示の高さ（メートル単位）
                "height": min(population / 100, 150000)  # 最大15万メートル
            }
        }
        features.append(feature)

    return {
        "type": "FeatureCollection",
        "features": features
    }


def main():
    output_dir = Path(__file__).parent.parent / "geojson"
    output_dir.mkdir(exist_ok=True)

    print("🔄 人口データGeoJSON生成開始...")

    # 1. 都道府県の円表示用データ
    prefecture_circle = create_circle_geojson(PREFECTURE_POPULATION, "prefecture")
    output_path = output_dir / "population-prefecture-circle.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(prefecture_circle, f, ensure_ascii=False, indent=2)
    print(f"✓ {output_path.name} - {len(prefecture_circle['features'])}都道府県")

    # 2. 都道府県の3D表示用データ
    prefecture_extrusion = create_extrusion_geojson(PREFECTURE_POPULATION, "prefecture")
    output_path = output_dir / "population-prefecture-3d.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(prefecture_extrusion, f, ensure_ascii=False, indent=2)
    print(f"✓ {output_path.name} - {len(prefecture_extrusion['features'])}都道府県")

    # 3. 市区町村の円表示用データ
    city_circle = create_circle_geojson(CITY_POPULATION, "city")
    output_path = output_dir / "population-city-circle.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(city_circle, f, ensure_ascii=False, indent=2)
    print(f"✓ {output_path.name} - {len(city_circle['features'])}市区町村")

    # 4. 市区町村の3D表示用データ
    city_extrusion = create_extrusion_geojson(CITY_POPULATION, "city")
    output_path = output_dir / "population-city-3d.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(city_extrusion, f, ensure_ascii=False, indent=2)
    print(f"✓ {output_path.name} - {len(city_extrusion['features'])}市区町村")

    print("\n🎉 人口データGeoJSON生成完了！")
    print(f"   出力先: {output_dir}")


if __name__ == "__main__":
    main()
