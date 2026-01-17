"""
ベクタータイルから都市域データを抽出してGeoJSONに変換するスクリプト
特定のズームレベルのベクタータイルデータを取得し、全スケールで一貫して表示できるGeoJSONを生成します。
"""

import requests
import json
import mapbox_vector_tile
from pathlib import Path
from shapely.geometry import shape, mapping, MultiPolygon
from shapely.ops import unary_union
import argparse
import math

def deg2num(lat_deg, lon_deg, zoom):
    """緯度経度からタイル座標を計算"""
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    xtile = int((lon_deg + 180.0) / 360.0 * n)
    ytile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return xtile, ytile

def num2deg(xtile, ytile, zoom):
    """タイル座標から緯度経度を計算"""
    n = 2.0 ** zoom
    lon_deg = xtile / n * 360.0 - 180.0
    lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * ytile / n)))
    lat_deg = math.degrees(lat_rad)
    return lat_deg, lon_deg

def fetch_vector_tile(z, x, y, url_template="https://tile.openstreetmap.jp/data/planet/{z}/{x}/{y}.pbf"):
    """ベクタータイルをダウンロード"""
    url = url_template.format(z=z, x=x, y=y)
    print(f"タイルをダウンロード中: {url}")

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.content
    except Exception as e:
        print(f"エラー: {url} - {e}")
        return None

def tile_to_geojson(tile_data, x, y, z, layer_name="landuse", filters=None):
    """ベクタータイルデータをGeoJSONに変換"""
    if not tile_data:
        return []

    try:
        # PBFをデコード
        decoded = mapbox_vector_tile.decode(tile_data)

        if layer_name not in decoded:
            return []

        layer = decoded[layer_name]
        features = []

        # タイルの境界を計算
        # num2deg returns (lat, lon)
        lat_nw, lon_nw = num2deg(x, y, z)      # 左上（北西）
        lat_se, lon_se = num2deg(x + 1, y + 1, z)  # 右下（南東）

        lon_min, lon_max = lon_nw, lon_se
        lat_min, lat_max = lat_se, lat_nw
        extent = 4096  # ベクタータイルの座標系のサイズ


        for feature in layer.get('features', []):
            props = feature.get('properties', {})

            # フィルタリング
            if filters:
                class_val = props.get('class', '')
                if class_val not in filters:
                    continue

            geom = feature.get('geometry', {})
            geom_type = geom.get('type', '')
            coords = geom.get('coordinates', [])

            # タイル座標を緯度経度に変換
            def transform_coords(coord_list, depth=0):
                if depth == 0 and geom_type == 'MultiPolygon':
                    # MultiPolygon: list of polygons
                    return [transform_coords(polygon, depth + 1) for polygon in coord_list]
                elif depth == 1 and geom_type == 'MultiPolygon':
                    # Each polygon: list of rings
                    return [transform_coords(ring, depth + 1) for ring in coord_list]
                elif depth == 0 and geom_type == 'Polygon':
                    # Polygon: list of rings
                    return [transform_coords(ring, depth + 1) for ring in coord_list]
                elif depth >= 1 or geom_type == 'LineString':
                    # Ring or LineString: list of coordinates
                    result = []
                    for coord in coord_list:
                        x_local, y_local = coord[0], coord[1]
                        lon = lon_min + (lon_max - lon_min) * x_local / extent
                        # y座標補正: 実測データとの照合により+45.4ピクセル補正が必要
                        lat = lat_min + (lat_max - lat_min) * (y_local + 45.4) / extent
                        result.append([lon, lat])
                    return result
                return coord_list

            transformed_coords = transform_coords(coords)

            geojson_feature = {
                "type": "Feature",
                "properties": props,
                "geometry": {
                    "type": geom_type,
                    "coordinates": transformed_coords
                }
            }

            features.append(geojson_feature)

        return features

    except Exception as e:
        print(f"タイル変換エラー (x={x}, y={y}, z={z}): {e}")
        return []

def extract_urban_areas(
    bbox,  # [min_lon, min_lat, max_lon, max_lat]
    zoom=7,
    output_path='../geojson/urban-areas.json',
    url_template="https://tile.openstreetmap.jp/data/planet/{z}/{x}/{y}.pbf",
    merge=True
):
    """
    指定された範囲と解像度でベクタータイルから都市域を抽出

    Args:
        bbox: [min_lon, min_lat, max_lon, max_lat] 日本全体なら [122, 24, 154, 46]
        zoom: タイルのズームレベル（7-9推奨）
        output_path: 出力GeoJSONファイル
        url_template: ベクタータイルのURLテンプレート
        merge: 同じクラスのポリゴンを結合するか
    """
    min_lon, min_lat, max_lon, max_lat = bbox

    # タイル範囲を計算
    x_min, y_min = deg2num(max_lat, min_lon, zoom)  # 北西（左上）
    x_max, y_max = deg2num(min_lat, max_lon, zoom)  # 南東（右下）

    print(f"ズームレベル {zoom} でタイル範囲: x={x_min}-{x_max}, y={y_min}-{y_max}")
    print(f"合計タイル数: {(x_max - x_min + 1) * (y_max - y_min + 1)}")

    all_features = []
    urban_filters = ['residential', 'commercial', 'industrial']

    # タイルを順次ダウンロード
    for x in range(x_min, x_max + 1):
        for y in range(y_min, y_max + 1):
            tile_data = fetch_vector_tile(zoom, x, y, url_template)
            features = tile_to_geojson(tile_data, x, y, zoom, "landuse", urban_filters)
            all_features.extend(features)

            if len(all_features) % 100 == 0 and len(all_features) > 0:
                print(f"進行状況: {len(all_features)} フィーチャー抽出済み")

    print(f"合計 {len(all_features)} フィーチャーを抽出")

    # ポリゴンを結合（オプション）
    if merge and all_features:
        print("ポリゴンを結合中...")
        try:
            geometries = []
            for f in all_features:
                try:
                    geom = shape(f['geometry'])
                    if geom.is_valid and not geom.is_empty:
                        geometries.append(geom)
                except Exception as e:
                    continue

            if geometries:
                merged = unary_union(geometries)

                # MultiPolygonまたはPolygonをGeoJSONに変換
                if merged.geom_type == 'Polygon':
                    merged = MultiPolygon([merged])

                all_features = [{
                    "type": "Feature",
                    "properties": {
                        "type": "urban",
                        "source": f"OpenStreetMap zoom {zoom}"
                    },
                    "geometry": mapping(merged)
                }]

                print(f"結合後: {len(all_features)} フィーチャー")
        except Exception as e:
            print(f"結合エラー: {e}")
            print("結合をスキップして元のフィーチャーを使用します")

    # GeoJSONとして保存
    geojson = {
        "type": "FeatureCollection",
        "features": all_features
    }

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"GeoJSONを保存中: {output_path}")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, ensure_ascii=False)

    file_size = output_path.stat().st_size
    print(f"完了！ファイルサイズ: {file_size / 1024 / 1024:.2f} MB")

    return output_path

def main():
    parser = argparse.ArgumentParser(description='ベクタータイルから都市域を抽出')
    parser.add_argument('--bbox', nargs=4, type=float,
                        default=[122, 24, 154, 46],
                        help='バウンディングボックス: min_lon min_lat max_lon max_lat')
    parser.add_argument('--zoom', type=int, default=7,
                        help='タイルのズームレベル（7-9推奨、デフォルト: 7）')
    parser.add_argument('--output', default='../geojson/urban-areas.json',
                        help='出力GeoJSONファイル')
    parser.add_argument('--no-merge', action='store_true',
                        help='ポリゴンを結合しない')
    parser.add_argument('--url', default='https://tile.openstreetmap.jp/data/planet/{z}/{x}/{y}.pbf',
                        help='ベクタータイルのURLテンプレート')

    args = parser.parse_args()

    print("=" * 60)
    print("ベクタータイルから都市域を抽出")
    print("=" * 60)
    print(f"範囲: {args.bbox}")
    print(f"ズームレベル: {args.zoom}")
    print(f"結合: {'無効' if args.no_merge else '有効'}")
    print("=" * 60)

    try:
        extract_urban_areas(
            bbox=args.bbox,
            zoom=args.zoom,
            output_path=args.output,
            url_template=args.url,
            merge=not args.no_merge
        )
    except KeyboardInterrupt:
        print("\n中断されました")
    except Exception as e:
        print(f"エラー: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
