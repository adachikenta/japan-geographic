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
$frontendPublicDir = "frontend\public"
$populationScriptDir = "data\processing"

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
Write-Host "[2/5] 人口データを生成..." -ForegroundColor Yellow

# Check and activate Python virtual environment
$checkVenvScript = ".\env\dev\check_venv.ps1"
if (-not (Test-Path $checkVenvScript)) {
    Write-Host "  ✗ check_venv.ps1 not found" -ForegroundColor Red
    Write-Host "  ⚠ Skipping population data generation" -ForegroundColor Yellow
} else {
    try {
        # Check if venv exists and activate it
        . $checkVenvScript -ActivateVenv

        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Virtual environment activated" -ForegroundColor Green

            # Run population data generation script
            Push-Location $populationScriptDir
            python create_population_data.py
            $exitCode = $LASTEXITCODE
            Pop-Location

            if ($exitCode -eq 0) {
                Write-Host "  ✓ 人口データ生成完了" -ForegroundColor Green
            } else {
                Write-Host "  ✗ 人口データ生成に失敗しました" -ForegroundColor Red
                exit 1
            }
        } else {
            Write-Host "  ✗ Virtual environment check failed" -ForegroundColor Red
            Write-Host "  ⚠ Skipping population data generation" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ✗ Error activating virtual environment: $_" -ForegroundColor Red
        Write-Host "  ⚠ Skipping population data generation" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "[3/5] ローカルR2ストレージディレクトリを作成..." -ForegroundColor Yellow

# ローカルR2ディレクトリを作成
if (-not (Test-Path $localR2Dir)) {
    New-Item -ItemType Directory -Path $localR2Dir -Force | Out-Null
    Write-Host "  ✓ ディレクトリ作成完了: $localR2Dir" -ForegroundColor Green
} else {
    Write-Host "  ✓ ディレクトリが既に存在します" -ForegroundColor Green
}

Write-Host ""
Write-Host "[4/5] GeoJSONファイルをコピー..." -ForegroundColor Yellow

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
Write-Host "[5/5] 人口データをfrontend/publicにコピー..." -ForegroundColor Yellow

$populationFiles = @(
    "population-prefecture-circle.json",
    "population-prefecture-3d.json",
    "population-city-circle.json",
    "population-city-3d.json"
)

$populationCopiedCount = 0
foreach ($fileName in $populationFiles) {
    $sourcePath = Join-Path $frontendPublicDir $fileName
    if (Test-Path $sourcePath) {
        try {
            Copy-Item -Path $sourcePath -Destination $localR2Dir -Force
            $fileSize = (Get-Item $sourcePath).Length
            $size = [math]::Round($fileSize / 1KB, 2)
            Write-Host "  ✓ $fileName ($size KB)" -ForegroundColor Green
            $populationCopiedCount++
        } catch {
            Write-Host "  ✗ $fileName - エラー: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "  ⚠ $fileName が見つかりません" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "セットアップ完了" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  地理データコピー完了: $copiedCount 個のファイル" -ForegroundColor Green
Write-Host "  人口データコピー完了: $populationCopiedCount 個のファイル" -ForegroundColor Green
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
