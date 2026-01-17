# ローカル開発用のR2モックデータを設定するスクリプト

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "ローカル開発用R2モックデータセットアップ" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# プロジェクトルートに移動
$projectRoot = Split-Path -Parent $PSScriptRoot
$projectRoot = Split-Path -Parent $projectRoot
Set-Location $projectRoot

Write-Host "[1/3] ディレクトリ構成を確認..." -ForegroundColor Yellow

$backendDir = "backend"
$localR2Dir = "$backendDir\.wrangler\state\v3\r2\japan-geographic-geojson"
$sourceDataDir = "data\geojson"

if (-not (Test-Path $backendDir)) {
    Write-Host "  ✗ backendディレクトリが見つかりません" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $sourceDataDir)) {
    Write-Host "  ✗ データディレクトリが見つかりません: $sourceDataDir" -ForegroundColor Red
    exit 1
}

Write-Host "  ✓ ディレクトリ構成OK" -ForegroundColor Green

Write-Host ""
Write-Host "[2/3] ローカルR2ストレージディレクトリを作成..." -ForegroundColor Yellow

# ローカルR2ディレクトリを作成
if (-not (Test-Path $localR2Dir)) {
    New-Item -ItemType Directory -Path $localR2Dir -Force | Out-Null
    Write-Host "  ✓ ディレクトリ作成完了: $localR2Dir" -ForegroundColor Green
} else {
    Write-Host "  ✓ ディレクトリが既に存在します" -ForegroundColor Green
}

Write-Host ""
Write-Host "[3/3] GeoJSONファイルをコピー..." -ForegroundColor Yellow

$jsonFiles = Get-ChildItem -Path $sourceDataDir -Filter "*.json" -File

if ($jsonFiles.Count -eq 0) {
    Write-Host "  ✗ コピー可能なJSONファイルが見つかりません" -ForegroundColor Red
    exit 1
}

$copiedCount = 0
foreach ($file in $jsonFiles) {
    try {
        Copy-Item -Path $file.FullName -Destination $localR2Dir -Force
        $size = [math]::Round($file.Length / 1KB, 2)
        Write-Host "  ✓ $($file.Name) ($size KB)" -ForegroundColor Green
        $copiedCount++
    } catch {
        Write-Host "  ✗ $($file.Name) - エラー: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "セットアップ完了" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  コピー完了: $copiedCount 個のファイル" -ForegroundColor Green
Write-Host ""

Write-Host "注意事項:" -ForegroundColor Yellow
Write-Host "  - このスクリプトはローカル開発環境専用です" -ForegroundColor Gray
Write-Host "  - wranglerの開発サーバーを起動する前に実行してください" -ForegroundColor Gray
Write-Host "  - .wranglerディレクトリはGitで管理されません" -ForegroundColor Gray
Write-Host ""

Write-Host "次のステップ:" -ForegroundColor Yellow
Write-Host "  1. バックエンド開発サーバーを起動:" -ForegroundColor Gray
Write-Host "     cd backend" -ForegroundColor Cyan
Write-Host "     pnpm dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. 別のターミナルでフロントエンドを起動:" -ForegroundColor Gray
Write-Host "     cd frontend" -ForegroundColor Cyan
Write-Host "     pnpm dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "  3. ブラウザでアクセス:" -ForegroundColor Gray
Write-Host "     http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
