(() => {
  'use strict';

  let engine = null;
  let ownerData = null;
  let runtimePromise = null;
  let started = false;
  let stateTimer = 0;

  function nativeState() {
    if (!started || typeof engine?._WolfWasm_BrowserRuntimeState !== 'function') return 'menu';
    return ['menu', 'menu', 'gameplay'][engine._WolfWasm_BrowserRuntimeState()] || 'menu';
  }

  function loadScript(source) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = source;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Could not load ${source}.`));
      document.head.appendChild(script);
    });
  }

  async function sha256Hex(file) {
    if (!globalThis.crypto?.subtle) throw new Error('SHA-256 verification requires HTTPS or localhost.');
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function loadEngine(ctx) {
    if (runtimePromise) return runtimePromise;
    runtimePromise = new Promise((resolve, reject) => {
      engine = globalThis.Module = {
        canvas: ctx.elements.canvas,
        noInitialRun: true,
        preRun: [() => { globalThis.SDL.defaults.copyOnLock = false; }],
        print: (...args) => ctx.log(`[Wolf3D] ${args.join(' ')}`),
        printErr: (...args) => ctx.log(`[Wolf3D] ${args.join(' ')}`),
        onAbort: reason => {
          ctx.log(`Wolfenstein 3D stopped: ${reason}`);
          ctx.showRuntime('crashed');
          reject(new Error(`Wolfenstein 3D stopped: ${reason}`));
        },
        setStatus: message => { if (message) ctx.setLoading(String(message)); },
        monitorRunDependencies: remaining => {
          if (remaining) ctx.setLoading('Loading Wolfenstein 3D engine…', `${remaining} dependencies remaining`);
        },
        onRuntimeInitialized: () => resolve(engine)
      };
      loadScript('/wolf3d.js').catch(reject);
    });
    return runtimePromise;
  }

  function startStatePolling(ctx) {
    window.clearInterval(stateTimer);
    stateTimer = window.setInterval(() => {
      const state = nativeState();
      if (ctx.shell.engineState() !== state) ctx.setEngineState(state);
    }, 100);
  }

  globalThis.WasmGameAdapter = Object.freeze({
    async init(ctx) {
      const manifest = await fetch('/wasm-game-data.json', { cache: 'no-store' }).then(response => {
        if (!response.ok) throw new Error(`Wolfenstein 3D data policy failed with HTTP ${response.status}.`);
        return response.json();
      });
      ownerData = ctx.framework.createOwnerDataSet({
        namespace: manifest.namespace,
        version: manifest.version,
        files: manifest.files.map(spec => ({
          ...spec,
          mountName: spec.name,
          validate: async file => {
            ctx.setLoading(`Verifying ${spec.name}…`);
            if (await sha256Hex(file) !== spec.sha256) throw new Error(`${spec.name} failed SHA-256 verification.`);
          }
        }))
      });
      ctx.elements.canvas.addEventListener('contextmenu', event => event.preventDefault());
    },

    async start(ctx) {
      if (started) return;
      void ctx.shell.resumeAudio();
      ctx.setLoading('Restoring registered Wolfenstein 3D data…', '', 5);
      const data = await ctx.dataClient.load(ownerData, {
        onProgress(detail) {
          if (detail.phase === 'checking-cache') ctx.setLoading(`Checking ${detail.key}…`);
          if (detail.phase === 'downloading') {
            const percent = detail.total ? Math.floor(detail.received * 100 / detail.total) : 0;
            ctx.setLoading(`Caching ${detail.key} from this container…`, `${percent}%`, Math.min(55, 5 + percent / 2));
          }
          if (detail.phase === 'restored') ctx.setLoading(`Restored ${detail.key} from this browser…`);
        }
      });
      document.documentElement.dataset.wasmDataSource = data.entries.every(entry => entry.cached) ? 'cache' : 'container';
      ctx.setLoading('Loading Wolfenstein 3D engine…', '', 60);
      await loadEngine(ctx);
      ctx.setLoading('Mounting registered game data…', '', 75);
      await ctx.framework.mountOwnerFiles(engine, data, {
        root: '/game',
        mode: 'memfs',
        onProgress(detail) {
          if (detail.phase === 'mounting' && detail.total) {
            ctx.setLoading('Mounting registered game data…', `${Math.floor(detail.copied * 100 / detail.total)}%`,
              75 + detail.copied * 20 / detail.total);
          }
        }
      });
      engine.FS.chdir('/game');
      started = true;
      ctx.setLoading('Starting Wolfenstein 3D…', '', 98);
      try { engine.callMain(['--res', '960', '720']); }
      catch (error) { if (error !== 'unwind') throw error; }
      ctx.showRuntime(nativeState());
      startStatePolling(ctx);
    },

    readEngineState() { return nativeState(); },
    captureLost() {
      if (started && typeof engine?._WolfWasm_BrowserOpenMenu === 'function') engine._WolfWasm_BrowserOpenMenu();
    },
    inputCaptureChanged(captured) {
      if (started && typeof engine?._WolfWasm_BrowserSetInputCaptured === 'function') {
        engine._WolfWasm_BrowserSetInputCaptured(captured ? 1 : 0);
      }
    }
  });
})();
