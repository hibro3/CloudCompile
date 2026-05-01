/**
 * executor.ts — Python-only, browser-native execution engine
 *
 * Python → Pyodide Web Worker + SharedArrayBuffer (blocks on input())
 *
 * SharedArrayBuffer requires Cross-Origin-Isolation headers (set in vite.config.ts).
 *
 * Standard library modules fully supported:
 *   math, random, datetime, sys, os, time, json, re, collections, itertools
 */

import { ExecutionResult, TerminalLine } from '../types'

// ---------------------------------------------------------------------------
// Shared-buffer protocol
//   controlBuf  = Int32Array[2]
//     [0] = state:  0=IDLE  1=WORKER_WAITING  2=INPUT_READY
//     [1] = byte-length of value written into dataBuf
//   dataBuf     = Uint8Array[DATA_BUF_SIZE]   (UTF-8 encoded input string)
// ---------------------------------------------------------------------------

const DATA_BUF_SIZE = 65_536   // 64 KB per input call
const CTRL_READY = 2

export type StreamCallback = (line: TerminalLine) => void

// ---------------------------------------------------------------------------
// Python (Pyodide) worker source
// NOTE: This string must NOT contain backticks at the outer level.
//       Inner Python strings are escaped as \` in the template.
// ---------------------------------------------------------------------------

const PYTHON_WORKER_SRC = `
"use strict";

var controlArr;
var dataArr;
var pyodide;

// ── Blocking input bridge ──────────────────────────────────────────────────
function blockingInput(prompt) {
  var p = prompt ? String(prompt) : '';
  if (p) self.postMessage({ type: 'stdout', text: p });
  self.postMessage({ type: 'input-request' });
  Atomics.store(controlArr, 0, 1);   // WORKER_WAITING
  Atomics.wait(controlArr, 0, 1);    // block until host writes CTRL_READY
  var len = Atomics.load(controlArr, 1);
  var shared = new Uint8Array(dataArr.buffer, 0, len);
  var plain  = new Uint8Array(len); plain.set(shared);
  var value  = new TextDecoder().decode(plain);
  Atomics.store(controlArr, 0, 0);   // IDLE
  return value;
}

async function run(code) {
  // ── Load Pyodide ──────────────────────────────────────────────────────────
  importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.0/full/pyodide.js');
  pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.0/full/' });

  // Expose JS helpers to Python namespace
  pyodide.globals.set('_js_blocking_input', blockingInput);

  // Streaming stdout / stderr
  pyodide.setStdout({
    batched: function(s) { self.postMessage({ type: 'stdout', text: s }); }
  });
  pyodide.setStderr({
    batched: function(s) { self.postMessage({ type: 'stderr', text: s }); }
  });

  // ── Full stdlib environment setup ─────────────────────────────────────────
  // All 10 modules are part of Python's stdlib and bundled with Pyodide.
  // We configure each one for accurate, consistent behaviour in the browser.
  pyodide.runPython(
    "import builtins, sys, os, time as _time_mod\\n" +
    "import math, random, datetime, json, re, collections, itertools\\n" +

    // ── sys ──────────────────────────────────────────────────────────────────
    // sys.argv, sys.platform ('emscripten'), sys.version already set by Pyodide.
    "sys.argv = ['main.py']\\n" +

    // ── os ───────────────────────────────────────────────────────────────────
    // Populate a realistic os.environ so code like os.getenv('HOME') works.
    "_env = {\\n" +
    "  'HOME':       '/home/user',\\n" +
    "  'USER':       'user',\\n" +
    "  'USERNAME':   'user',\\n" +
    "  'LOGNAME':    'user',\\n" +
    "  'PATH':       '/usr/local/bin:/usr/bin:/bin',\\n" +
    "  'LANG':       'en_US.UTF-8',\\n" +
    "  'LC_ALL':     'en_US.UTF-8',\\n" +
    "  'TERM':       'xterm-256color',\\n" +
    "  'SHELL':      '/bin/sh',\\n" +
    "  'TMPDIR':     '/tmp',\\n" +
    "  'TMP':        '/tmp',\\n" +
    "  'TEMP':       '/tmp',\\n" +
    "  'PYTHONPATH': '',\\n" +
    "}\\n" +
    "for _k, _v in _env.items():\\n" +
    "  os.environ.setdefault(_k, _v)\\n" +
    "del _env, _k, _v\\n" +
    // Create /home/user in the virtual FS so os.path.exists(os.environ['HOME']) == True
    "try:\\n" +
    "  os.makedirs('/home/user', exist_ok=True)\\n" +
    "  os.makedirs('/tmp', exist_ok=True)\\n" +
    "  os.chdir('/home/user')\\n" +
    "except Exception:\\n" +
    "  pass\\n" +

    // ── time.sleep() ─────────────────────────────────────────────────────────
    // Pyodide workers support Atomics.wait so sleep truly blocks.
    // We cap it at 30 s to prevent accidental infinite hangs.
    "_orig_sleep = _time_mod.sleep\\n" +
    "def _safe_sleep(seconds):\\n" +
    "  capped = max(0.0, min(float(seconds), 30.0))\\n" +
    "  if capped > 0:\\n" +
    "    _orig_sleep(capped)\\n" +
    "_time_mod.sleep = _safe_sleep\\n" +
    "import time\\n" +           // re-bind the public 'time' name too
    "time.sleep = _safe_sleep\\n" +

    // ── input / stdin ─────────────────────────────────────────────────────────
    "def _custom_input(prompt=''):\\n" +
    "  raw = _js_blocking_input(str(prompt) if prompt else '')\\n" +
    "  return raw.rstrip('\\\\n')\\n" +
    "builtins.input = _custom_input\\n" +

    "class _InteractiveStdin:\\n" +
    "  def readline(self):\\n" +
    "    line = _js_blocking_input('')\\n" +
    "    return line if line.endswith('\\\\n') else line + '\\\\n'\\n" +
    "  def read(self, n=-1):\\n" +
    "    return _js_blocking_input('')\\n" +
    "  def readlines(self):\\n" +
    "    return [self.readline()]\\n" +
    "  def isatty(self): return True\\n" +
    "sys.stdin = _InteractiveStdin()\\n" +

    // ── sys.exit() / quit() / exit() ─────────────────────────────────────────
    "def _patched_exit(code=0): raise SystemExit(code)\\n" +
    "sys.exit = _patched_exit\\n" +
    "builtins.exit = type('Quitter', (), {'__call__': staticmethod(_patched_exit), '__repr__': lambda s: 'Use exit() or Ctrl-D to exit'})()\\n" +
    "builtins.quit = builtins.exit\\n"
  );

  var t0 = Date.now();
  try {
    await pyodide.runPythonAsync(code);
    self.postMessage({ type: 'done', exitCode: 0, cpuTime: (Date.now()-t0)/1000 });
  } catch(err) {
    var raw = String(err.message || err);
    // Strip Pyodide wrapper prefix
    var msg = raw.startsWith('PythonError: ') ? raw.slice(13) : raw;

    // ── Clean SystemExit / sys.exit() handling ──────────────────────────────
    if (msg.includes('SystemExit')) {
      var m = msg.match(/SystemExit:\\s*(-?\\d+)/);
      var code = m ? parseInt(m[1]) : 0;
      if (code !== 0) {
        self.postMessage({ type: 'system', text: 'Process exited with code ' + code });
      }
      self.postMessage({ type: 'done', exitCode: code, cpuTime: (Date.now()-t0)/1000 });
      return;
    }

    self.postMessage({ type: 'stderr', text: msg });
    self.postMessage({ type: 'done', exitCode: 1, cpuTime: (Date.now()-t0)/1000 });
  }
}

self.onmessage = function(e) {
  var msg = e.data;
  if (msg.type !== 'run') return;
  controlArr = new Int32Array(msg.controlBuf);
  dataArr    = new Uint8Array(msg.dataBuf);
  run(msg.code).catch(function(err){
    self.postMessage({ type: 'stderr', text: 'Fatal: ' + String(err) });
    self.postMessage({ type: 'done', exitCode: 1, cpuTime: 0 });
  });
};
`

// ---------------------------------------------------------------------------
// Generic streaming runner
// ---------------------------------------------------------------------------

function runInWorker(
  workerSrc: string,
  code: string,
  onLine: StreamCallback,
  onInputRequest: () => Promise<string>,
  timeoutMs: number
): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const controlBuf = new SharedArrayBuffer(8)          // Int32Array[2]
    const dataBuf = new SharedArrayBuffer(DATA_BUF_SIZE)
    const controlArr = new Int32Array(controlBuf)

    const blob = new Blob([workerSrc], { type: 'application/javascript' })
    const worker = new Worker(URL.createObjectURL(blob))

    let exitCode = 0
    let cpuTime = 0

    const timer = setTimeout(() => {
      worker.terminate()
      onLine({ id: uid(), type: 'system', text: '⏱ Execution timed out (60 s)' })
      resolve({ stdout: '', stderr: 'Execution timed out', exitCode: 1, status: 'timeout' })
    }, timeoutMs)

    worker.onmessage = async ({ data }) => {
      switch (data.type) {
        case 'system':
          onLine({ id: uid(), type: 'system', text: data.text })
          break

        case 'stdout':
          onLine({ id: uid(), type: 'stdout', text: data.text })
          break

        case 'stderr':
          onLine({ id: uid(), type: 'stderr', text: data.text })
          break

        case 'input-request': {
          // Get value from the interactive terminal, then unblock the worker
          const value = await onInputRequest()
          const encoded = new TextEncoder().encode(value + '\n')
          const len = Math.min(encoded.length, DATA_BUF_SIZE)
          new Uint8Array(dataBuf).set(encoded.subarray(0, len))
          Atomics.store(controlArr, 1, len)   // store length
          Atomics.store(controlArr, 0, CTRL_READY)
          Atomics.notify(controlArr, 0)
          break
        }

        case 'done':
          clearTimeout(timer)
          exitCode = data.exitCode
          cpuTime = data.cpuTime ?? 0
          worker.terminate()
          resolve({
            stdout: '',   // streaming – caller collects lines
            stderr: '',
            exitCode,
            cpuTime,
            status: exitCode === 0 ? 'success' : 'error',
          })
          break
      }
    }

    worker.onerror = (e) => {
      clearTimeout(timer)
      onLine({ id: uid(), type: 'stderr', text: e.message })
      worker.terminate()
      resolve({ stdout: '', stderr: e.message, exitCode: 1, status: 'error' })
    }

    // Kick off
    worker.postMessage({ type: 'run', code, controlBuf, dataBuf })
  })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Execute Python code with streaming output.
 *
 * @param code             Source code
 * @param onLine           Called for every output line as it appears
 * @param onInputRequest   Called when the program calls input(); resolve with the typed string
 */
export async function executeCode(
  code: string,
  onLine: StreamCallback,
  onInputRequest: () => Promise<string>
): Promise<ExecutionResult> {
  return runInWorker(PYTHON_WORKER_SRC, code, onLine, onInputRequest, 60_000)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _id = 0
function uid() { return String(++_id) }

export function isRuntimeLoading() { return false }
