# wolf3d-wasm implementation runbook

Read `/home/ted/Development/wasm/RUNBOOK.md` first. This downstream project
starts from the native Wolf4SDL source. Its Emscripten target, launcher, data
mount, main-loop adaptation, audio path, input policy, persistence, server
lifecycle, and Docker packaging are implemented here; no existing Wolfenstein
3D WASM port is an implementation input.

Never submit work upstream. Never commit, upload, or package retail data.

## Current checkpoint

`./build-web.sh` produces an assetless SDL1/Emscripten client in
`build-web/dist/`. The launcher accepts the eight full-version `.WL6` files
from the owner's browser, mounts them under `/game`, and starts the native
engine only after all are present. Audio is temporarily stubbed. The original
blocking loop still relies on Asyncify and needs conversion to an explicit
cooperative frame loop before gameplay is a proven milestone.

Build and serve:

```bash
./build-web.sh
./serve-web.sh 8011
```

Steam completed the Wolfenstein 3D install during the 2026-08-14 checkpoint.
The portfolio Docker lab stages the registered data outside Git and exposes it
only through its loopback-only, read-only `/local-data/` mount. Opening
`/?localdata=1` now loads all eight files automatically; Chrome confirmed the
exact data-ready state and invoked the engine. A deeper visual/input pass is
still required because the current Asyncify loop prevents clean automation
inspection after startup. The required owner files are `AUDIOHED.WL6`,
`AUDIOT.WL6`, `GAMEMAPS.WL6`, `MAPHEAD.WL6`, `VGADICT.WL6`, `VGAGRAPH.WL6`,
`VGAHEAD.WL6`, and `VSWAP.WL6`.
