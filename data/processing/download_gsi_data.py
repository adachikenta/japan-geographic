"""
国土数値情報から土地利用データをダウンロードするスクリプト
"""

import requests
from pathlib import Path
import zipfile
import argparse

# 国土数値情報の土地利用データURL（例：令和3年度版）
# 実際のURLはhttps://nlftp.mlit.go.jp/ksj/で確認してください
LANDUSE_URLS = {
    '2021': 'https://nlftp.mlit.go.jp/ksj/gml/data/L03-b/L03-b-21/L03-b-21_GML.zip',
    # 他の年度のURLを追加可能
}

def download_file(url, output_path):
    """
    ファイルをダウンロード
    """
    print(f"ダウンロード中: {url}")
    response = requests.get(url, stream=True)
    response.raise_for_status()

    total_size = int(response.headers.get('content-length', 0))
    block_size = 8192
    downloaded = 0

    with open(output_path, 'wb') as f:
        for chunk in response.iter_content(block_size):
            f.write(chunk)
            downloaded += len(chunk)
            if total_size > 0:
                percent = (downloaded / total_size) * 100
                print(f"\r進行状況: {percent:.1f}%", end='')

    print(f"\nダウンロード完了: {output_path}")
    return output_path

def extract_zip(zip_path, extract_to):
    """
    ZIPファイルを解凍
    """
    print(f"解凍中: {zip_path}")
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_to)
    print(f"解凍完了: {extract_to}")

def download_landuse_data(year='2021', output_dir='../raw'):
    """
    土地利用データをダウンロードして解凍
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if year not in LANDUSE_URLS:
        print(f"エラー: {year}年のデータURLが設定されていません")
        print(f"利用可能な年度: {list(LANDUSE_URLS.keys())}")
        return None

    url = LANDUSE_URLS[year]
    zip_path = output_dir / f"landuse_{year}.zip"

    # ダウンロード
    download_file(url, zip_path)

    # 解凍
    extract_dir = output_dir / f"landuse_{year}"
    extract_zip(zip_path, extract_dir)

    # Shapefileを探す
    shapefiles = list(extract_dir.rglob("*.shp"))
    if shapefiles:
        print(f"\n見つかったShapefile:")
        for shp in shapefiles:
            print(f"  - {shp}")
        return shapefiles[0]
    else:
        print("警告: Shapefileが見つかりませんでした")
        return None

def main():
    parser = argparse.ArgumentParser(description='国土数値情報土地利用データをダウンロード')
    parser.add_argument('--year', default='2021', help='データ年度（デフォルト: 2021）')
    parser.add_argument('--output', default='../raw', help='出力ディレクトリ')

    args = parser.parse_args()

    try:
        shapefile = download_landuse_data(args.year, args.output)
        if shapefile:
            print(f"\n次のステップ:")
            print(f"python convert_gsi_landuse.py \"{shapefile}\" ../geojson/gsi-landcover.json")
    except Exception as e:
        print(f"エラー: {e}")
        print("\n手動ダウンロード方法:")
        print("1. https://nlftp.mlit.go.jp/ksj/ にアクセス")
        print("2. '土地利用細分メッシュデータ' を検索")
        print("3. ダウンロードしたZIPを data/raw/ に解凍")
        print("4. convert_gsi_landuse.py を実行")

if __name__ == '__main__':
    main()
