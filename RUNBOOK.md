# wolf3d-wasm implementation runbook

This downstream project starts from the native Wolf4SDL source. Its
Emscripten target, launcher, data
mount, main-loop adaptation, audio path, input policy, persistence, server
lifecycle, and Docker packaging are implemented here; no existing Wolfenstein
3D WASM port is an implementation input.

Never submit work upstream. Never commit, upload, or package game data.

## Current checkpoint

`./build-web.sh` produces an assetless SDL1/Emscripten client in
`build-web/dist/`. Framework 0.7.1 at `9359fb1` owns the canonical launcher, exact
container provisioning, browser IndexedDB cache, 4:3 canvas, input capture,
fullscreen preference, and PWA installation metadata. The adapter mounts the
eight validated full-version `.WL6` files under `/game` and starts the native
engine only after all are present. The browser target uses an in-process SDL1
PCM mixer for digitized effects plus the native software OPL callback for
music; it no longer depends on unavailable SDL_mixer browser binaries. The
original
blocking loop runs on an Emscripten pthread while SDL presentation is proxied
to the browser thread, keeping the page responsive without Asyncify.

Build and serve:

```bash
./build-web.sh
./serve-web.sh 8011
```

Steam completed the Wolfenstein 3D install during the 2026-08-14 checkpoint.
The portfolio Docker lab stages the required data outside Git. The framework
server exposes only exact validated files through `/game-data/files/<key>`;
`/data` remains private. Each browser caches those files once in IndexedDB.
Chrome previously confirmed the
exact data-ready state, rendered the authentic Options/main menu, accepted
keyboard selection, and launched Episode 1 into a rendered playable level.
The browser path keeps the native palette-indexed renderer: Emscripten SDL1
palette surfaces are copied and unlocked explicitly so its canvas layer expands
the 8-bit frame into RGBA. No alternate renderer or existing WASM port is used.
The web input policy maps W/S to forward/back, A/D to strafe, and accumulated
relative mouse X to turning while deliberately discarding mouse Y because the
game has no vertical view axis. Save persistence and the Spear of Destiny data
path still need their dedicated passes. The required files are `AUDIOHED.WL6`,
`AUDIOT.WL6`, `GAMEMAPS.WL6`, `MAPHEAD.WL6`, `VGADICT.WL6`, `VGAGRAPH.WL6`,
`VGAHEAD.WL6`, and `VSWAP.WL6`.

Chromium evidence from 2026-08-14:

1. `/?localdata=1` loaded all eight files from the loopback mount.
2. Play kept the page responsive while the original blocking loop ran on its
   Emscripten worker.
3. The authentic menu and episode/difficulty screens rendered with the correct
   game artwork and palette.
4. Enter navigation launched Episode 1, Floor 1 with the HUD and 3D scene
   visible. The current launch emitted no new browser runtime errors.
