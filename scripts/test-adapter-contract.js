#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const repo = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(repo, 'web/wasm-game.json'), 'utf8'));
const dataManifest = JSON.parse(fs.readFileSync(path.join(repo, 'web/wasm-game-data.json'), 'utf8'));
const listeners = new Map();
const intervals = [];
const stateChanges = [];
let shellState = 'launcher';
let nativeState = 1;
let openMenuCalls = 0;
let captureValue = -1;
let mainArguments = null;
let now = 1000;

const engineParts = {
  FS: { chdir() {} },
  callMain(args) { mainArguments = args; },
  _WolfWasm_BrowserRuntimeState: () => nativeState,
  _WolfWasm_BrowserOpenMenu() { openMenuCalls += 1; nativeState = 4; },
  _WolfWasm_BrowserSetInputCaptured(value) { captureValue = value; },
  _WolfWasm_BrowserCaptureIntent: () => nativeState === 5 ? 1 : 0,
  _WolfWasm_BrowserControlsMask: () => 31
};
const canvas = { addEventListener() {} };
const sandbox = {
  URLSearchParams,
  console,
  queueMicrotask,
  performance: { now: () => now },
  location: { search: '', href: 'http://localhost/' },
  fetch: async () => ({ ok: true, json: async () => dataManifest }),
  document: {
    documentElement: { dataset: {} },
    createElement: () => ({}),
    head: {
      appendChild(script) {
        Object.assign(sandbox.Module, engineParts);
        script.onload();
        sandbox.Module.onRuntimeInitialized();
      }
    },
    addEventListener(type, listener) {
      const current = listeners.get(type) || [];
      current.push(listener);
      listeners.set(type, current);
    }
  },
  window: {
    setInterval(callback) { intervals.push(callback); return intervals.length; },
    clearInterval() {}
  }
};
sandbox.globalThis = sandbox;
vm.runInNewContext(fs.readFileSync(path.join(repo, 'web/game-adapter.js'), 'utf8'), sandbox,
  { filename: 'web/game-adapter.js' });

const context = {
  elements: { canvas },
  framework: {
    createOwnerDataSet: policy => policy,
    mountOwnerFiles: async () => {}
  },
  dataClient: {
    load: async policy => ({ entries: policy.files.map(file => ({ cached: true, policy: file })) })
  },
  shell: {
    engineState: () => shellState,
    async resumeAudio() {}
  },
  setLoading() {}, log() {},
  setEngineState(state, options) {
    shellState = state;
    stateChanges.push({ state, capture: options?.capture === true, event: options?.event });
  },
  showRuntime(state) { shellState = state; }
};

(async () => {
  assert.equal(config.fullscreen, true);
  assert.equal(config.identity, false);
  assert.equal(config.graphics, false);
  assert.equal(config.displayMode, '4:3');
  assert.equal(config.canvasWidth / config.canvasHeight, 4 / 3);
  assert.equal(config.pwa.icons.length, 2);
  assert.equal(dataManifest.files.length, 8);
  assert.ok(dataManifest.files.every(file => file.sha256));

  const playSource = fs.readFileSync(path.join(repo, 'wl_play.cpp'), 'utf8');
  assert.match(playSource, /WOLF4SDL_WEB[\s\S]*dirscan\[4\] = \{ sc_W, sc_D, sc_S, sc_A \}/);
  assert.match(playSource, /ex_completed[\s\S]*ex_secretlevel[\s\S]*ex_victorious \? 3 : 1/);
  assert.match(fs.readFileSync(path.join(repo, 'Makefile'), 'utf8'), /_WolfWasm_BrowserControlsMask/);
  assert.match(fs.readFileSync(path.join(repo, 'Makefile'), 'utf8'), /_WolfWasm_BrowserCaptureIntent/);
  const menuSource = fs.readFileSync(path.join(repo, 'wl_menu.cpp'), 'utf8');
  assert.match(menuSource, /startgame \|\| loadedgame[\s\S]*WolfWasmRuntimeState = 5/,
    'New Game and Load must synchronously publish native loading intent');
  assert.match(menuSource, /WolfWasmRuntimeState = ingame \? 4 : 1/,
    'menu entry must distinguish the paused and main-menu states');
  assert.match(fs.readFileSync(path.join(repo, 'id_in.cpp'), 'utf8'),
    /WolfWasmRuntimeState = 4;[\s\S]*LastScan = sc_Escape/,
    'capture loss must synchronously publish the native paused transition');

  const adapter = sandbox.WasmGameAdapter;
  await adapter.init(context);
  await adapter.start(context);
  assert.deepEqual(Array.from(mainArguments), ['--res', '960', '720']);
  assert.equal(shellState, 'menu');

  nativeState = 2;
  intervals.at(-1)();
  assert.equal(shellState, 'gameplay');
  assert.equal(sandbox.document.documentElement.dataset.wolf3dControlsValid, 'true');
  nativeState = 3;
  intervals.at(-1)();
  assert.equal(shellState, 'debrief');

  nativeState = 5;
  assert.equal(adapter.readEngineState(), 'loading');
  assert.equal(adapter.readCaptureIntent(), true);

  nativeState = 2;
  shellState = 'menu';
  const event = { key: 'Escape' };
  for (const listener of listeners.get('keyup')) listener(event);
  await Promise.resolve();
  assert.equal(stateChanges.at(-1).state, 'gameplay');
  assert.equal(stateChanges.at(-1).capture, true);
  assert.equal(stateChanges.at(-1).event, event);

  adapter.captureLost({}, context);
  assert.equal(openMenuCalls, 1);
  assert.equal(shellState, 'paused');
  adapter.inputCaptureChanged(true);
  assert.equal(captureValue, 1);

  nativeState = 2;
  now += 100;
  for (const listener of listeners.get('keydown')) listener({ key: 'Escape' });
  adapter.captureLost({}, context);
  assert.equal(openMenuCalls, 1, 'Escape-triggered capture loss must not inject a second menu action');
  console.log('Verified Wolf3D WASD/mouse, state, Resume capture, fixed display, PWA, and data-cache behavior.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
