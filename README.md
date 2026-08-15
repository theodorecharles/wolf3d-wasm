# Wolf3D WASM

Wolf3D WASM builds the native Wolf4SDL source as a browser game with
Emscripten and the shared
[WASM Game Framework](https://github.com/theodorecharles/wasm-game-framework).
The framework supplies the launcher, validated container provisioning,
browser cache, installable PWA metadata, fullscreen preference, fixed 4:3
viewport, and input-capture lifecycle. This repository supplies the native
engine adaptation, declarative game policy, and source-distributed artwork.

## Status

| Title | Status |
| --- | --- |
| Wolfenstein 3D | Still in development |
| Spear of Destiny | Still in development |

Wolfenstein 3D reaches its authentic menu and a playable level in Chromium.
The current data policy supports the `.WL6` release. Spear of Destiny has not
yet been added to the launcher or game-data policy.

## Controls and presentation

- W/S move forward and backward.
- A/D strafe.
- Horizontal mouse movement turns; vertical mouse movement is intentionally
  ignored because Wolfenstein 3D has no vertical view axis.
- Clicking gameplay captures input. Menus and lost capture release it.
- The original palette-indexed renderer is presented in a contained 4:3
  viewport without stretching.

## Game data

No Wolfenstein 3D data files are committed to Git or copied into the Docker
image. On first deployment, select the eight required `.WL6` files through
the framework provisioner. They are checked against the exact filename, size,
and SHA-256 policy in `web/wasm-game-data.json` before being stored atomically
in the container's persistent `/data` volume.

The server never exposes `/data` as a directory. Browsers download only the
validated allowlist and retain it in origin-private IndexedDB, so later
launches normally restore the game files without downloading them again.

## Build locally

Prerequisites include Make, ImageMagick, Node.js, and an initialized
Emscripten SDK.

```bash
git clone https://github.com/theodorecharles/wolf3d-wasm.git
git clone https://github.com/theodorecharles/wasm-game-framework.git ../wasm-game-framework
git -C ../wasm-game-framework checkout 11b9af479e40927336d18f5ddfc41d9cc2b224c7

cd wolf3d-wasm
EMSDK_DIR=/path/to/emsdk ./build-web.sh
WOLF3D_DATA_ROOT=/path/to/persistent-data ./serve-web.sh 8011
```

Open `http://127.0.0.1:8011/`. The framework server owns `/` and its setup
flow; this project deliberately ships no `index.html`, CSS, service worker, or
web manifest.

## Docker

```bash
WASM_FRAMEWORK_DIR=../wasm-game-framework \
  ./scripts/build-image.sh wolf3d-wasm:dev

docker run --rm -p 8088:8088 \
  -v wolf3d-wasm-data:/data \
  wolf3d-wasm:dev
```

Keep the `/data` volume across container upgrades. The image contains engine
code and framework assets only.

## Contributing

Read [RUNBOOK.md](RUNBOOK.md) before changing native browser seams. Preserve
the game-data boundary and native builds where practical. Do not submit this
WebAssembly port or its patches to the upstream Wolf4SDL project.
