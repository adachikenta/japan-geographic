# R2バケットへGeoJSONデータをアップロードするスクリプト

param(
    [string]$BucketName = "japan-geographic-geojson",
    [string]$DataDir = "data/geojson"
)

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "R2バケットへGeoJSONデータをアップロード" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# プロジェクトルートに移動
$projectRoot = Split-Path -Parent $PSScriptRoot
$projectRoot = Split-Path -Parent $projectRoot
Set-Location $projectRoot

Write-Host "[1/4] R2バケットの確認..." -ForegroundColor Yellow

# バケットの存在確認（エラーは無視）
Write-Host "  バケット '$BucketName' を確認中..." -ForegroundColor Gray
$bucketExists = $false
try {
    $result = wrangler r2 bucket list 2>$null | Select-String $BucketName
    if ($result) {
        $bucketExists = $true
        Write-Host "  ✓ バケットが存在します" -ForegroundColor Green
    }
} catch {
    # エラーは無視
}

if (-not $bucketExists) {
    Write-Host "  バケットが存在しません。作成しますか? (Y/N): " -ForegroundColor Yellow -NoNewline
    $response = Read-Host
    if ($response -eq "Y" -or $response -eq "y") {
        Write-Host "  バケットを作成中..." -ForegroundColor Gray
        wrangler r2 bucket create $BucketName
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ バケット作成完了" -ForegroundColor Green
        } else {
            Write-Host "  ✗ バケット作成失敗" -ForegroundColor Red
            Write-Host ""
            Write-Host "代替方法: ローカル開発環境でテストする場合は、wranglerのローカルモードを使用してください。" -ForegroundColor Yellow
            Write-Host "  cd backend" -ForegroundColor Cyan
            Write-Host "  pnpm dev" -ForegroundColor Cyan
            exit 1
        }
    } else {
        Write-Host "  スキップしました" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "注意: R2バケットがない場合、GeoJSONデータの取得はできません。" -ForegroundColor Yellow
        Write-Host "ローカル開発の場合は、Cloudflare Dashboardでバケットを作成するか、" -ForegroundColor Yellow
        Write-Host "ローカルモックデータを使用してください。" -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""
Write-Host "[2/4] データディレクトリの確認..." -ForegroundColor Yellow
if (-not (Test-Path $DataDir)) {
    Write-Host "  ✗ データディレクトリが見つかりません: $DataDir" -ForegroundColor Red
    exit 1
}

$jsonFiles = Get-ChildItem -Path $DataDir -Filter "*.json" -File
if ($jsonFiles.Count -eq 0) {
    Write-Host "  ✗ アップロード可能なJSONファイルが見つかりません" -ForegroundColor Red
    exit 1
}

Write-Host "  ✓ $($jsonFiles.Count) 個のJSONファイルを検出" -ForegroundColor Green

Write-Host ""
Write-Host "[3/4] ファイル一覧:" -ForegroundColor Yellow
foreach ($file in $jsonFiles) {
    $size = [math]::Round($file.Length / 1KB, 2)
    Write-Host "  - $($file.Name) ($size KB)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[4/4] アップロード中..." -ForegroundColor Yellow

$successCount = 0
$failCount = 0

foreach ($file in $jsonFiles) {
    Write-Host "  アップロード: $($file.Name)..." -ForegroundColor Gray -NoNewline

    try {
        # wrangler r2 object putコマンドを使用
        $result = wrangler r2 object put "$BucketName/$($file.Name)" --file "$($file.FullName)" 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Host " ✓" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host " ✗" -ForegroundColor Red
            Write-Host "    エラー: $result" -ForegroundColor Red
            $failCount++
        }
    } catch {
        Write-Host " ✗" -ForegroundColor Red
        Write-Host "    エラー: $_" -ForegroundColor Red
        $failCount++
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "アップロード完了" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  成功: $successCount 個" -ForegroundColor Green
Write-Host "  失敗: $failCount 個" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Gray" })
Write-Host ""

if ($successCount -gt 0) {
    Write-Host "次のステップ:" -ForegroundColor Yellow
    Write-Host "  1. バックエンドサーバーを起動:" -ForegroundColor Gray
    Write-Host "     cd backend && pnpm dev" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  2. フロントエンドサーバーを起動:" -ForegroundColor Gray
    Write-Host "     cd frontend && pnpm dev" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  3. ブラウザでアクセス:" -ForegroundColor Gray
    Write-Host "     http://localhost:3000" -ForegroundColor Cyan
    Write-Host ""
}

if ($failCount -gt 0) {
    Write-Host "トラブルシューティング:" -ForegroundColor Yellow
    Write-Host "  - Cloudflareにログインしているか確認: wrangler whoami" -ForegroundColor Gray
    Write-Host "  - R2バケットが存在するか確認: wrangler r2 bucket list" -ForegroundColor Gray
    Write-Host "  - ファイルパスが正しいか確認" -ForegroundColor Gray
    exit 1
}
