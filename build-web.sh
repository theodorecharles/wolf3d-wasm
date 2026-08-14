#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
dist_dir="$repo_dir/build-web/dist"

if ! command -v emcc >/dev/null 2>&1; then
    emsdk_dir="${EMSDK_DIR:-${EMSDK:-}}"
    if [[ -z "$emsdk_dir" || ! -f "$emsdk_dir/emsdk_env.sh" ]]; then
        printf 'Activate Emscripten first, or set EMSDK_DIR to an emsdk checkout.\n' >&2
        exit 1
    fi
    # shellcheck source=/dev/null
    source "$emsdk_dir/emsdk_env.sh" >/dev/null
fi

make -C "$repo_dir" clean
mkdir -p "$dist_dir"
rm -f \
    "$dist_dir/index.html" \
    "$dist_dir/index.js" \
    "$dist_dir/index.wasm" \
    "$dist_dir/index.data" \
    "$dist_dir/wolf3d.html" \
    "$dist_dir/wolf3d.js" \
    "$dist_dir/wolf3d.wasm" \
    "$dist_dir/wolf3d.data"
emmake make -C "$repo_dir" -j"$(nproc)" \
    WEB=1 \
    CC=emcc \
    CXX=em++ \
    BINARY=build-web/dist/index.html

printf '[Wolf4SDL WASM] Browser build ready: %s/index.html\n' "$dist_dir"
