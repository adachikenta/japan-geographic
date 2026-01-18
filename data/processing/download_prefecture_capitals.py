"""
OpenStreetMapから都道府県庁の座標を取得

データソース: Overpass API (OpenStreetMap)
タグ: government=prefecture (都道府県庁)
"""

import requests
import json
from pathlib import Path
import time

# Overpass API エンドポイント
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# 都道府県庁を検索するOverpass QLクエリ（複数パターンを検索）
OVERPASS_QUERY = """
[out:json][timeout:60];
area["name:en"="Japan"]["ISO3166-1"="JP"]->.japan;
(
  node(area.japan)["name"~"県庁$|府庁$|都庁$|道庁$"];
  node(area.japan)["name:ja"~"県庁$|府庁$|都庁$|道庁$"];
);
out body;
"""

def query_overpass():
    """Overpass APIにクエリを送信"""
    print("🔄 OpenStreetMapデータを取得中...")

    try:
        response = requests.post(
            OVERPASS_URL,
            data={'data': OVERPASS_QUERY},
            timeout=60
        )
        response.raise_for_status()

        print("✓ ダウンロード完了")
        return response.json()
    except Exception as e:
        print(f"❌ ダウンロードエラー: {e}")
        return None

def extract_prefecture_capitals(osm_data):
    """OSMデータから都道府県庁を抽出"""

    prefecture_data = {}

    if 'elements' not in osm_data:
        return prefecture_data

    for element in osm_data['elements']:
        if element.get('type') != 'node':
            continue

        tags = element.get('tags', {})

        # 名前を取得（日本語優先）
        name = tags.get('name:ja') or tags.get('name') or tags.get('name:en')

        if not name:
            continue

        # 座標
        lat = element.get('lat')
        lon = element.get('lon')

        if not (lat and lon):
            continue

        # 都道府県名を抽出（「〜県庁」「〜府庁」などから）
        pref_name = None
        if '県庁' in name:
            pref_name = name.replace('県庁', '') + '県'
        elif '府庁' in name:
            pref_name = name.replace('府庁', '') + '府'
        elif '都庁' in name:
            pref_name = name.replace('都庁', '') + '都'
        elif '道庁' in name:
            pref_name = name.replace('道庁', '')

        if pref_name:
            prefecture_data[pref_name] = {
                'lat': lat,
                'lon': lon,
                'facility': name
            }

    return prefecture_data

def format_for_python(prefecture_data):
    """Python辞書形式で出力"""
    print("\n" + "="*60)
    print("Python辞書形式（create_population_data.py用）")
    print("="*60)
    print("\nPREFECTURE_CAPITALS = {")

    for pref, data in sorted(prefecture_data.items()):
        # [経度, 緯度] の順番（GeoJSON形式）
        print(f'    "{pref}": {{"center": [{data["lon"]:.5f}, {data["lat"]:.5f}]}},  # {data["facility"]}')

    print("}")

def main():
    print("="*60)
    print("OpenStreetMap 都道府県庁座標取得")
    print("="*60)
    print()

    # データダウンロード
    osm_data = query_overpass()

    if not osm_data:
        print("❌ データ取得に失敗しました")
        return

    # 都道府県庁データを抽出
    print("🔄 都道府県庁データを抽出中...")
    prefecture_data = extract_prefecture_capitals(osm_data)

    print(f"✓ {len(prefecture_data)}件の都道府県庁データを取得")

    if len(prefecture_data) == 0:
        print("\n⚠️  データが取得できませんでした")
        print("手動で国土数値情報サイトからダウンロードすることをお勧めします:")
        print("https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-P34.html")
        return

if __name__ == "__main__":
    main()
