# Web開発サーバーを起動するスクリプト（node-linker切り替え〜起動まで一括実行）
# 実行: powershell -ExecutionPolicy Bypass -File scripts\switch-to-web.ps1

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "==> Java/Gradle関連プロセスを終了" -ForegroundColor Cyan
# Android側のGradle daemonが残っているとファイルロックの原因になるため終了させる。
taskkill /F /IM java.exe 2>$null

Write-Host "==> node-linker を isolated に設定" -ForegroundColor Cyan
pnpm config set node-linker isolated

Write-Host "==> node_modules を削除" -ForegroundColor Cyan
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue

Write-Host "==> pnpm install" -ForegroundColor Cyan
pnpm install

Write-Host "==> Web開発サーバーを起動" -ForegroundColor Cyan
pnpm dev:web
