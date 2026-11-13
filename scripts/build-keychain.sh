#!/bin/sh
set -eu
project_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
mkdir -p "$project_dir/runtime/bin"
clang -O2 -arch arm64 -arch x86_64 -mmacosx-version-min=13.0 "$project_dir/runtime/keychain.m" -framework Foundation -framework Security -o "$project_dir/runtime/bin/chatgpt-keychain"
chmod 755 "$project_dir/runtime/bin/chatgpt-keychain"
printf '%s\n' '已构建本机钥匙串辅助程序。'
