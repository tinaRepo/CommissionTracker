# Metro（バンドラ）だけを起動する軽量スクリプト。
# ネイティブビルドは行わない。すでに一度 switch-to-android.ps1 でAndroidアプリを
# ビルド・インストール済みの場合、毎日の開発はこちらだけで十分。
# 実行: powershell -ExecutionPolicy Bypass -File scripts\start-metro.ps1

$root = Split-Path -Parent $PSScriptRoot
Set-Location "$root\apps\mobile"

Write-Host "==> Metroを起動（ビルドは行いません）" -ForegroundColor Cyan
# hoistedモードでは apps\mobile\node_modules\.bin\expo の参照解決が壊れるため、
# ルートに実在する expo CLI を直接 node で実行する。
node "$root\node_modules\expo\bin\cli" start
