# japan-geographic

日本地図の上に様々な情報を重ねて表示するWebアプリケーションです。
山地、平野、盆地、河川などの地理情報を表示できます。
都道府県、市区町村などの行政区画境界を表示できます。
鉄道、道路、空港、港湾などのインフラ情報を表示できます。
平野、盆地単位での大きさ、人口、人口密度、経済規模などの統計情報を表示できます。
都道府県などの行政区画単位での大きさ、人口、人口密度、経済規模などの統計情報を表示できます。
年単位での人口推移、、経済規模推移などの時系列情報を表示できます。

## 使用用途

地理的条件と社会経済的条件の関係性を分析するためのツールとして利用できます。
都市計画、地域開発、災害対策などの分野での意思決定支援ツールとして利用できます。
教育目的での地理情報の可視化ツールとして利用できます。
観光情報の提供ツールとして利用できます。

メイン用途は、研究者や学生が地理情報と社会経済情報の関係性から各研究分野の課題を分析するための支援ツールとしての利用です。
そのため、ユーザーの利用シーンの想定としては、大学や研究機関での研究活動や授業での利用が中心となり、利用する際の端末は主にデスクトップPCやノートPCを想定し、且つ、27インチから80インチ程度かそれ以上のの大画面モニターやプロジェクターでのスクリーン表示での利用を想定しています。
また、教育目的での利用シーンとしては、学校や教育機関での授業や講義での利用が中心となり、利用する際の端末は主にデスクトップPCやノートPC、タブレット端末を想定し、且つ、プロジェクターでのスクリーン表示での利用を想定しています。

## 技術スタック

大量のユーザーが日常的に利用することを想定していないため、パフォーマンス最適化やスケーラビリティの確保は二次的な課題とし、まずは機能実装とユーザー体験の向上を優先しています
ユーザー体験の向上のため、デザインの受け入れやすさ、操作の直感性、情報の視覚的なわかりやすさを重視しています。

そのため、以下の技術スタックを採用しています。

Frontend: Next.js 15 (App Router)
├── TypeScript 5.6
├── react-map-gl@^7.1 (Mapbox GL JS / MapLibre GL JS)
├── @kepler.gl/components@^3.0 (地理データ探索UI)
├── @kepler.gl/reducers (Redux Toolkit統合)
├── Tailwind CSS (レスポンシブ大画面UI)
└── Framer Motion (レイヤー切り替えアニメーション)

Backend: Hono + Cloudflare Workers
├── Hono@^4.0 (TypeScriptネイティブAPIフレームワーク)
├── @turf/turf (GeoJSON空間演算・統計集計)
├── better-sqlite3 (D1互換ローカル開発)
└── zod (APIリクエストバリデーション)

Data Layer: Cloudflareエコシステム
├── D1 (SQLite互換・地理統計・時系列データ)
├── R2 (国土数値情報GeoJSON/CSVアーカイブ)
└── Vector Tiles (PMTiles形式・動的生成)

Deployment: Vercel (Next.jsネイティブ・自動Edge最適化)
└── Cloudflare Workers (APIエッジ配信・D1接続)

## 開発環境構築

### 前提条件

- Windows 10/11
- PowerShell 5.1以上

### セットアップ手順

#### 0. (オプション) Python Flask遺産のクリーンアップ

既存のPython Flask関連ファイルを削除する場合：

```powershell
.\env\dev\cleanup_python.ps1
```

このスクリプトは以下を削除します：
- app.py (Flaskアプリケーション)
- templates/ (Jinja2テンプレート)
- tests/*.py (Pythonテスト)
- requirements.txt, pytest.ini, babel.cfg
- Python専用スクリプト

#### 1. 初期環境構築

リポジトリをクローン後、以下のコマンドを実行します。

```batch
_setup.bat
```

このスクリプトは以下の処理を自動で行います：

1. **Scoopのインストール** (未インストールの場合)
   - Windowsパッケージマネージャー

2. **開発ツールのインストール**
   - Git
   - Node.js LTS
   - pnpm (パッケージマネージャー)
   - Wrangler (Cloudflare Workers CLI)

3. **プロジェクト構造の作成**
   - `frontend/` - Next.js 15アプリケーション
   - `backend/` - Hono + Cloudflare Workers API

4. **依存関係のインストール**
   - フロントエンド: Next.js、React、Tailwind CSS、Kepler.gl、react-map-gl等
   - バックエンド: Hono、@turf/turf、Zod等

#### 1.5. 翻訳ファイルの変換

Flask-Babelの.poファイルをNext.js i18n用のJSONに変換：

```powershell
.\env\dev\convert_po_to_json.ps1
```

このスクリプトは：
- translations/*.po を locales/*.json に変換
- next-intl の設定ガイドを生成
- msgfmt (gettext) は不要になります

#### 1.6. テスト環境のセットアップ

フロントエンドのテスト環境（Vitest + Playwright）を構築：

```powershell
.\env\dev\setup_tests.ps1
```

バックエンドのテスト環境を構築：

```powershell
.\env\dev\setup_backend_tests.ps1
```

#### 2. 開発サーバーの起動

まず、ローカル開発用のR2モックデータをセットアップします：

```batch
_setup_local_r2.bat
```

このスクリプトは以下を行います：
- サンプルGeoJSONデータをローカルR2ストレージにコピー
- Wranglerのローカル開発環境でR2バケットをエミュレート

次に、開発サーバーを起動します：

```batch
_start_app.bat
```

このスクリプトは以下のサーバーを起動します：

- **フロントエンド (Next.js)**: <http://localhost:3000>
- **バックエンド (Hono + Wrangler)**: <http://localhost:8787>

各サーバーは別々のPowerShellウィンドウで起動します。停止する場合は各ウィンドウで `Ctrl+C` を押してください。

#### 3. テストの実行

```batch
_test_app.bat
```

このスクリプトは以下のテストを実行します：

- TypeScript型チェック（フロントエンド/バックエンド）
- フロントエンドのユニットテスト（Vitest）
- バックエンドのユニットテスト（Vitest + Cloudflare Workers）

E2Eテストを実行する場合：

```powershell
.\env\dev\test_app.ps1 --e2e
```

個別にテストを実行する場合：

```powershell
# フロントエンド
cd frontend
pnpm test              # ユニットテスト
pnpm test:ui          # UIモード
pnpm test:coverage    # カバレッジレポート
pnpm test:e2e         # E2Eテスト（Playwright）
pnpm test:e2e:ui      # PlaywrightUIモード

# バックエンド
cd backend
pnpm test              # ユニットテスト
pnpm test:coverage    # カバレッジレポート
```

#### 4. クリーンアップ

```batch
_clean.bat
```

このスクリプトは以下をクリーンアップします：

- `node_modules/` ディレクトリ (フロントエンド/バックエンド)
- `.next/` ビルドディレクトリ
- `.wrangler/` Cloudflare Workers開発ディレクトリ
- その他のビルドアーティファクト
- Gitで無視されるファイル

### ディレクトリ構造

```text
japan-geographic/
├── frontend/              # Next.js 15 フロントエンド
│   ├── app/              # App Router
│   ├── components/       # Reactコンポーネント
│   ├── public/           # 静的ファイル
│   └── package.json
├── backend/              # Hono + Cloudflare Workers
│   ├── src/
│   │   └── index.ts     # APIエントリーポイント
│   ├── wrangler.toml    # Cloudflare Workers設定
│   └── package.json
├── env/dev/             # 開発環境スクリプト
│   ├── setup_env.ps1
│   ├── setup_packages.ps1
│   ├── start_app.ps1
│   ├── clean.ps1
│   └── test_app.ps1
├── _setup.bat           # セットアップ実行
├── _start_app.bat       # 開発サーバー起動
├── _test_app.bat        # テスト実行
└── _clean.bat           # クリーンアップ実行
```

### 次のステップ

開発環境が構築できたら、以下の作業に進めます：

1. ✅ **完了**: R2バケットの設定とGeoJSONデータの準備
   - wrangler.tomlにR2バケット設定を追加済み
   - サンプルGeoJSONデータ（都道府県境界）を作成済み
   - ローカル開発用のR2モックスクリプトを作成済み

2. ✅ **完了**: フロントエンドのマップコンポーネント実装
   - react-map-gl + MapLibre GL JSを使用したマップコンポーネント作成済み
   - GeoJSONデータの読み込みと表示機能を実装済み
   - ホームページにマップを統合済み

3. ✅ **完了**: バックエンドのGeoJSON API実装
   - R2バケットからGeoJSONを取得するAPIエンドポイント作成済み
   - `/api/geojson/:filename` - 特定のGeoJSONファイルを取得
   - `/api/geojson` - 利用可能なファイル一覧を取得

### 本番環境へのデプロイ

#### R2バケットの作成とデータアップロード

Cloudflare Dashboardまたはwrangler CLIを使用してR2バケットを作成し、データをアップロードします：

```powershell
# R2バケットを作成
wrangler r2 bucket create japan-geographic-geojson

# GeoJSONデータをアップロード
.\env\dev\upload_geojson.ps1
```

#### Cloudflare Workersのデプロイ

```powershell
cd backend
pnpm run deploy
```

#### Vercelへのデプロイ

```powershell
cd frontend
vercel deploy
```

### 今後の開発予定

4. Cloudflare D1データベースの設定と統計データの格納
5. より詳細な地理データの追加（山地、平野、盆地、河川など）
6. Kepler.glを使用した高度な地理データ探索UIの実装
7. 時系列データの可視化機能
