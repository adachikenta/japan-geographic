"""
Natural Earthの土地被覆データをダウンロードして変換するスクリプト
日本周辺のデータを抽出して処理します
"""

import requests
from pathlib import Path
import zipfile
import geopandas as gpd
import json
from shapely.geometry import mapping, box

# Natural Earth データURL（1:50m Urban Areas）
URBAN_URL = "https://naturalearth.s3.amazonaws.com/50m_cultural/ne_50m_urban_areas.zip"
# Forest areas - これは直接ないので、GSIデータが必要
# ここでは代替として、OSMベースのデータを使用する方法を提案

# 日本の境界（緯度経度）
JAPAN_BBOX = {
    'minx': 122.0,  # 西端
    'miny': 24.0,   # 南端
    'maxx': 148.0,  # 東端
    'maxy': 46.0    # 北端
}

def download_natural_earth(output_dir='../raw'):
    """
    Natural Earthデータをダウンロード
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    zip_path = output_dir / "ne_land.zip"

    print(f"Natural Earthデータをダウンロード中...")
    print(f"URL: {NATURAL_EARTH_URL}")

    response = requests.get(NATURAL_EARTH_URL, stream=True)
    response.raise_for_status()

    total_size = int(response.headers.get('content-length', 0))
    downloaded = 0

    with open(zip_path, 'wb') as f:
        for chunk in response.iter_content(8192):
            f.write(chunk)
            downloaded += len(chunk)
            if total_size > 0:
                percent = (downloaded / total_size) * 100
                print(f"\r進行状況: {percent:.1f}%", end='')

    print(f"\nダウンロード完了")

    # 解凍
    extract_dir = output_dir / "natural_earth"
    extract_dir.mkdir(exist_ok=True)

    print(f"解凍中...")
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_dir)

    shapefiles = list(extract_dir.glob("*.shp"))
    print(f"解凍完了。Shapefile: {shapefiles[0] if shapefiles else 'なし'}")

    return shapefiles[0] if shapefiles else None

def process_natural_earth_for_japan(input_shapefile, output_geojson):
    """
    Natural Earthデータから日本周辺のデータを抽出してGeoJSONに変換
    """
    print(f"\nShapefileを読み込み中: {input_shapefile}")
    gdf = gpd.read_file(input_shapefile)

    print(f"元のCRS: {gdf.crs}")
    print(f"元のデータ件数: {len(gdf)}")

    # WGS84に変換
    if gdf.crs != "EPSG:4326":
        gdf = gdf.to_crs("EPSG:4326")

    # 日本周辺のデータを抽出
    print("日本周辺のデータを抽出中...")
    japan_box = box(JAPAN_BBOX['minx'], JAPAN_BBOX['miny'],
                    JAPAN_BBOX['maxx'], JAPAN_BBOX['maxy'])

    gdf_japan = gdf[gdf.intersects(japan_box)].copy()
    print(f"抽出後のデータ件数: {len(gdf_japan)}")

    # 日本の範囲でクリップ
    gdf_japan['geometry'] = gdf_japan['geometry'].intersection(japan_box)

    # 簡略化
    print("ジオメトリを簡略化中...")
    gdf_japan['geometry'] = gdf_japan['geometry'].simplify(0.01, preserve_topology=True)

    # typeカラムを追加（Natural Earthは陸地のみなので'grassland'とする）
    gdf_japan['type'] = 'grassland'

    # GeoJSON作成
    features = []
    for idx, row in gdf_japan.iterrows():
        if row['geometry'] and not row['geometry'].is_empty:
            feature = {
                "type": "Feature",
                "properties": {
                    "type": "grassland",
                    "name": "陸地"
                },
                "geometry": mapping(row['geometry'])
            }
            features.append(feature)

    geojson = {
        "type": "FeatureCollection",
        "features": features
    }

    # 保存
    print(f"GeoJSONを保存中: {output_geojson}")
    with open(output_geojson, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)

    file_size = Path(output_geojson).stat().st_size
    print(f"完了！ファイルサイズ: {file_size / 1024:.2f} KB")

def main():
    print("=" * 60)
    print("Natural Earth 土地被覆データ処理")
    print("=" * 60)

    try:
        # ダウンロード
        shapefile = download_natural_earth()

        if shapefile:
            # 変換
            output_geojson = Path('../geojson/natural-earth-landcover.json')
            output_geojson.parent.mkdir(exist_ok=True)

            process_natural_earth_for_japan(shapefile, output_geojson)

            print("\n" + "=" * 60)
            print("処理完了！")
            print(f"出力ファイル: {output_geojson}")
            print("\n次のステップ:")
            print("1. frontend/public/simple-landcover.json を置き換える")
            print("2. ブラウザで土地被覆図2を確認")
            print("=" * 60)
        else:
            print("エラー: Shapefileが見つかりませんでした")

    except Exception as e:
        print(f"エラー: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
