# 国土地理院データ処理

このディレクトリには、国土地理院の土地利用データを処理するスクリプトが含まれています。

## セットアップ

```powershell
# Python環境の確認
python --version

# 必要なパッケージのインストール
pip install -r requirements.txt
```

## 使用方法

### 方法1: 自動ダウンロード（推奨）

```powershell
# データのダウンロードと解凍
python download_gsi_data.py --year 2021 --output ../raw

# GeoJSONへ変換
python convert_gsi_landuse.py "../raw/landuse_2021/L03-b-21_GML/*.shp" ../geojson/gsi-landcover.json
```

### 方法2: 手動ダウンロード

1. 国土数値情報からデータをダウンロード
   - URL: https://nlftp.mlit.go.jp/ksj/
   - 「土地利用細分メッシュデータ」を検索
   - 最新年度のデータをダウンロード

2. ZIPファイルを `data/raw/` に解凍

3. Shapefileのパスを確認してスクリプト実行

```powershell
python convert_gsi_landuse.py "path/to/shapefile.shp" ../geojson/gsi-landcover.json --simplify 0.001
```

### オプション

- `--simplify`: ジオメトリの簡略化レベル（デフォルト: 0.001）
  - 値を大きくするとファイルサイズが小さくなるが精度が下がる
  - 値を小さくすると精度が上がるがファイルサイズが大きくなる

## データの配置

変換したGeoJSONファイルを使用する場合：

1. `frontend/public/simple-landcover.json` を置き換え
2. または新しいスタイルファイルを作成

## 出典明示

このデータを使用する場合、以下の出典を明示してください：

> 国土数値情報（土地利用細分メッシュデータ）国土交通省

または

> Geospatial Information Authority of Japan
