# Web開発サーバーだけを起動する軽量スクリプト。
# node-linkerの切り替え・node_modulesの再インストールは行わない。
# すでに isolated モードのままWeb開発を続けている場合は、こちらだけで十分。
# 実行: powershell -ExecutionPolicy Bypass -File scripts\start-web.ps1

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "==> Web開発サーバーを起動（依存の再インストールは行いません）" -ForegroundColor Cyan
pnpm dev:web
