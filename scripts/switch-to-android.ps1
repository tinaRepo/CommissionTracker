# Androidネイティブビルドを行うスクリプト（node-linker切り替え〜ビルドまで一括実行）
# 実行: powershell -ExecutionPolicy Bypass -File scripts\switch-to-android.ps1

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "==> Java/Gradle/エミュレータ関連プロセスを終了" -ForegroundColor Cyan
# Gradle daemonやAndroidエミュレータがファイルをロックしたまま残っていると、
# node_modules・.cxx・.gradle等の削除がEPERMで失敗するため、先に終了させる。
taskkill /F /IM java.exe               2>$null
taskkill /F /IM emulator.exe           2>$null
taskkill /F /IM qemu-system-x86_64.exe 2>$null

Write-Host "==> node-linker を hoisted に設定" -ForegroundColor Cyan
pnpm config set node-linker hoisted

Write-Host "==> node_modules を削除" -ForegroundColor Cyan
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue

Write-Host "==> Androidネイティブビルドキャッシュを削除" -ForegroundColor Cyan
Remove-Item -Recurse -Force apps\mobile\android\app\.cxx -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force apps\mobile\android\app\build -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force apps\mobile\android\build -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force apps\mobile\android\.gradle -ErrorAction SilentlyContinue

Write-Host "==> pnpm install" -ForegroundColor Cyan
pnpm install

Write-Host "==> Androidビルドを実行" -ForegroundColor Cyan
# hoistedモードでは apps\mobile\node_modules 配下に実体パッケージが置かれず、
# ルートの node_modules にのみ集約される。
# そのため `npx expo` 経由（apps\mobile\node_modules\.bin\expo の参照解決）は失敗するので、
# ルートに実在する expo CLI のエントリポイントを直接 node で実行する。
Set-Location "$root\apps\mobile"
node "$root\node_modules\expo\bin\cli" run:android
