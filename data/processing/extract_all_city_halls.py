"""
全国の市区町村役場座標を統合抽出

国土数値情報 P34-14 (2014年度) 全47都道府県データを処理
"""
import geopandas as gpd
import pandas as pd
import zipfile
import os
from pathlib import Path

GML_DIR = Path('C:/repos/japan-geographic/GML')
OUTPUT_DIR = Path('C:/repos/japan-geographic/data/processing')

def extract_all_zips():
    """全zipファイルを解凍"""
    print("=" * 70)
    print("ZIP解凍処理開始")
    print("=" * 70)

    zip_files = sorted(GML_DIR.glob('P34-14_*.zip'))
    print(f"📦 {len(zip_files)}個のzipファイルを検出\n")

    extract_dir = GML_DIR / 'extracted'
    extract_dir.mkdir(exist_ok=True)

    for zip_path in zip_files:
        pref_num = zip_path.stem.split('_')[1]
        pref_dir = extract_dir / f'P34-14_{pref_num}_GML'

        if pref_dir.exists():
            print(f"⏭️  {zip_path.name} - 既に解凍済み")
            continue

        print(f"📂 {zip_path.name} を解凍中...")
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(pref_dir)
            print(f"   ✓ 完了")
        except Exception as e:
            print(f"   ✗ エラー: {e}")

    print(f"\n✅ 解凍完了: {extract_dir}\n")
    return extract_dir

def extract_coordinates_from_shapefiles(extract_dir):
    """全Shapefileから座標を抽出"""
    print("=" * 70)
    print("Shapefile座標抽出")
    print("=" * 70)

    all_data = []

    # 各都道府県フォルダを処理
    pref_dirs = sorted(extract_dir.glob('P34-14_*_GML'))

    for pref_dir in pref_dirs:
        shp_files = list(pref_dir.glob('*.shp'))

        if not shp_files:
            print(f"⚠️  {pref_dir.name}: Shapefileなし")
            continue

        shp_path = shp_files[0]
        pref_num = pref_dir.name.split('_')[1]

        try:
            gdf = gpd.read_file(shp_path, encoding='shift-jis')
            print(f"✓ {pref_dir.name}: {len(gdf)}件のデータ")

            for idx, row in gdf.iterrows():
                # P34_003: 役場名称, P34_004: 住所
                city_name = row['P34_003'].replace('役所', '').replace('役場', '')
                address = row['P34_004']
                lon = row.geometry.x
                lat = row.geometry.y

                all_data.append({
                    'prefecture_code': pref_num,
                    'city_name': city_name,
                    'address': address,
                    'longitude': lon,
                    'latitude': lat
                })

        except Exception as e:
            print(f"✗ {pref_dir.name}: エラー - {e}")

    print(f"\n✅ 合計 {len(all_data)}件のデータを抽出\n")
    return pd.DataFrame(all_data)

def save_outputs(df):
    """結果を保存"""
    print("=" * 70)
    print("出力ファイル生成")
    print("=" * 70)

    # CSV出力
    csv_path = OUTPUT_DIR / 'all_city_halls.csv'
    df.to_csv(csv_path, index=False, encoding='utf-8-sig')
    print(f"✅ CSV: {csv_path}")

    # 統計情報
    print(f"\n📊 都道府県別データ数:")
    pref_counts = df['prefecture_code'].value_counts().sort_index()
    for pref_code, count in pref_counts.items():
        print(f"   {pref_code}: {count}件")

    # 磐田市の座標を確認
    print(f"\n🔍 磐田市の座標:")
    iwata = df[df['city_name'].str.contains('磐田市')]
    if len(iwata) > 0:
        for idx, row in iwata.iterrows():
            print(f"   {row['city_name']}")
            print(f"   住所: {row['address']}")
            print(f"   座標: [{row['longitude']}, {row['latitude']}]")
            print(f"   現在の設定値: [137.8515211, 34.717837]")
            print(f"   差分: 経度 {abs(row['longitude'] - 137.8515211):.6f}, 緯度 {abs(row['latitude'] - 34.717837):.6f}")

    # Python辞書形式で主要市のみ出力（人口3万以上に対応）
    print(f"\n📝 主要市データ用の辞書を生成中...")

    # 市名から座標を引けるようにする
    city_coords = {}
    for idx, row in df.iterrows():
        # "〇〇市", "〇〇町", "〇〇村" を抽出
        city_name = row['city_name']

        # 既にある市名は上書きしない（最初のエントリを優先）
        if city_name not in city_coords:
            city_coords[city_name] = {
                'center': [row['longitude'], row['latitude']],
                'address': row['address']
            }

    # Python辞書ファイル生成
    py_path = OUTPUT_DIR / 'all_city_halls_dict.py'
    with open(py_path, 'w', encoding='utf-8') as f:
        f.write('"""\\n')
        f.write('全国市区町村役場座標データ\\n')
        f.write('\\n')
        f.write('出典: 国土数値情報 市町村役場データ（2014年度）\\n')
        f.write('URL: https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-P34.html\\n')
        f.write('座標系: 世界測地系（WGS84）\\n')
        f.write('形式: [経度, 緯度] (GeoJSON形式)\\n')
        f.write('"""\\n\\n')
        f.write('CITY_HALL_COORDINATES = {\\n')

        for city_name in sorted(city_coords.keys()):
            coords = city_coords[city_name]
            lon, lat = coords['center']
            f.write(f'    "{city_name}": {{"center": [{lon:.7f}, {lat:.7f}]}},\\n')

        f.write('}\\n')

    print(f"✅ Python辞書: {py_path}")
    print(f"   {len(city_coords)}個の市区町村")

def main():
    print("\\n🗾 全国市区町村役場座標統合処理\\n")

    # 1. ZIP解凍
    extract_dir = extract_all_zips()

    # 2. 座標抽出
    df = extract_coordinates_from_shapefiles(extract_dir)

    # 3. 出力
    save_outputs(df)

    print("\\n" + "=" * 70)
    print("✅ 処理完了")
    print("=" * 70)

if __name__ == '__main__':
    main()
