"""
国土地理院の土地利用データをGeoJSONに変換するスクリプト
国土数値情報の土地利用データ（Shapefile形式）を処理します
"""

import geopandas as gpd
import json
from pathlib import Path
from shapely.geometry import mapping
import argparse

def simplify_landuse_category(code):
    """
    土地利用コードを簡略化されたカテゴリに変換
    国土数値情報の土地利用分類コードに基づく
    """
    # 土地利用分類コード（国土数値情報）
    # 01: 田, 02: 畑, 03: 果樹園, 05: 森林, 06: 荒地
    # 07: 建物用地, 09: 幹線交通用地, 11: その他の用地
    # 14: 河川地及び湖沼, 15: 海浜, 16: 海水域

    code_str = str(code).zfill(2)

    if code_str in ['05']:  # 森林
        return 'forest'
    elif code_str in ['01', '02', '03', '06']:  # 田畑、荒地
        return 'grassland'
    elif code_str in ['14', '15', '16']:  # 水域
        return 'water'
    else:
        return None  # 建物用地や道路は除外

def process_landuse_data(input_path, output_path, simplify_tolerance=0.001):
    """
    土地利用データを処理してGeoJSONに変換

    Args:
        input_path: 入力Shapefileのパス
        output_path: 出力GeoJSONのパス
        simplify_tolerance: ジオメトリ簡略化の許容度（度単位）
    """
    print(f"データ読み込み中: {input_path}")
    gdf = gpd.read_file(input_path)

    print(f"元のデータ件数: {len(gdf)}")
    print(f"元のCRS: {gdf.crs}")

    # WGS84に変換
    if gdf.crs != "EPSG:4326":
        print("WGS84 (EPSG:4326) に変換中...")
        gdf = gdf.to_crs("EPSG:4326")

    # 土地利用コードのカラム名を探す
    code_column = None
    for col in ['L05_006', 'L03_006', 'code', 'landuse']:
        if col in gdf.columns:
            code_column = col
            break

    if not code_column:
        print(f"警告: 土地利用コードのカラムが見つかりません。利用可能なカラム: {list(gdf.columns)}")
        code_column = gdf.columns[0]

    print(f"土地利用コードカラム: {code_column}")

    # カテゴリ変換
    print("土地利用カテゴリを変換中...")
    gdf['type'] = gdf[code_column].apply(simplify_landuse_category)

    # 不要なカテゴリを除外
    gdf = gdf[gdf['type'].notna()]
    print(f"フィルタ後のデータ件数: {len(gdf)}")

    # ジオメトリを簡略化
    print(f"ジオメトリを簡略化中（許容度: {simplify_tolerance}）...")
    gdf['geometry'] = gdf['geometry'].simplify(simplify_tolerance, preserve_topology=True)

    # タイプごとにグループ化して統合
    print("タイプごとにポリゴンを統合中...")
    dissolved = gdf.dissolve(by='type', as_index=False)
    print(f"統合後のフィーチャー数: {len(dissolved)}")

    # GeoJSON用のフィーチャーリスト作成
    features = []
    for idx, row in dissolved.iterrows():
        feature = {
            "type": "Feature",
            "properties": {
                "type": row['type']
            },
            "geometry": mapping(row['geometry'])
        }
        features.append(feature)

    # GeoJSON作成
    geojson = {
        "type": "FeatureCollection",
        "features": features
    }

    # ファイル保存
    print(f"GeoJSONを保存中: {output_path}")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)

    # ファイルサイズ確認
    file_size = Path(output_path).stat().st_size
    print(f"完了！ファイルサイズ: {file_size / 1024 / 1024:.2f} MB")

    return geojson

def main():
    parser = argparse.ArgumentParser(description='国土地理院土地利用データをGeoJSONに変換')
    parser.add_argument('input', help='入力Shapefileのパス')
    parser.add_argument('output', help='出力GeoJSONのパス')
    parser.add_argument('--simplify', type=float, default=0.001,
                        help='ジオメトリ簡略化の許容度（デフォルト: 0.001）')

    args = parser.parse_args()

    process_landuse_data(args.input, args.output, args.simplify)

if __name__ == '__main__':
    main()
