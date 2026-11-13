#!/bin/zsh
set -eu
source_dir="$(cd "$(dirname "$0")/.." && pwd)"
install_dir="$HOME/Library/Application Support/Adobe/CEP/extensions/cn.department.aeassistant"
if [[ "$(defaults read com.adobe.CSXS.11 PlayerDebugMode 2>/dev/null || true)" != "1" ]]; then
  print '这是未签名开发版。尚未开启 CEP 11 开发模式；请让开发人员处理签名或开发模式配置。安装程序不会自动降低签名检查。'
  exit 1
fi
mkdir -p "$install_dir"
for folder in CSXS panel core host runtime; do cp -R "$source_dir/$folder" "$install_dir/"; done
print '已安装。保存工程并重启 AE 2024，在 窗口 → 扩展 → Motion Relay（开发版） 打开。'
